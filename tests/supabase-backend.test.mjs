import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const OWNER = "00000000-0000-4000-8000-000000000001",
  CASHIER = "00000000-0000-4000-8000-000000000002",
  CUSTOMER = "00000000-0000-4000-8000-000000000003",
  STOCK = "00000000-0000-4000-8000-000000000004";
const migrations = new URL("../supabase/migrations/", import.meta.url);
const sql = (
  await Promise.all(
    (await readdir(migrations))
      .filter((x) => x.endsWith(".sql"))
      .sort()
      .map((x) => readFile(new URL(x, migrations), "utf8")),
  )
).join("\n");
let db;
async function asUser(id) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function command(action, payload, key = crypto.randomUUID()) {
  return (
    await db.query("select public.admin_command($1,$2::jsonb,$3) result", [
      action,
      JSON.stringify(payload),
      key,
    ])
  ).rows[0].result;
}
test("Supabase SQL: permissions, branch stock, atomic checkout, retry protection and shift closing", async (t) => {
  db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.sub',true))$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.jwt() to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id uuid,name text,bucket_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 create publication supabase_realtime;`);
    await db.exec(sql);
    await db.exec(`insert into auth.users(id,email) values('${OWNER}','owner@example.test'),('${CASHIER}','cashier@example.test'),('${CUSTOMER}','customer@example.test'),('${STOCK}','stock@example.test');
 insert into auth.sessions select id,id from auth.users;
 insert into public.branches values('second-store','Second store',true);
 insert into public.staff(user_id,name,role,branch_ids) values('${OWNER}','Owner','owner',array['main-store','second-store']),('${CASHIER}','Cashier','cashier',array['main-store']),('${STOCK}','Stock','stock_controller',array['main-store']);
 insert into public.products(id,name,code,selling_price_cents,tax_rate) values('paint','Paint','P001',11500,15),('no-price','No price','P002',null,15);
 insert into public.inventory(branch_id,product_id,on_hand) values('main-store','paint',2),('second-store','paint',10),('main-store','no-price',3);`);
    await t.test(
      "customers cannot self-promote or read staff data",
      async () => {
        await asUser(CUSTOMER);
        await assert.rejects(
          () => command("update-role", { userId: CUSTOMER, role: "owner" }),
          /staff identity|Permission/,
        );
        await db.query("select public.save_profile($1::jsonb)", [
          JSON.stringify({ role: "owner", displayName: "Customer" }),
        ]);
        assert.equal(
          (
            await db.query("select data from public.profiles where id=$1", [
              CUSTOMER,
            ])
          ).rows[0].data.role,
          "customer",
        );
        assert.equal(
          (await db.query("select * from public.business_records")).rows.length,
          0,
        );
        await assert.rejects(
          () => db.query("update public.inventory set on_hand=100"),
          /permission denied/,
        );
      },
    );
    let shift;
    await t.test(
      "database commands reject fractional cents, missing count versions, malformed items and bypassed legacy entry points",
      async () => {
        await asUser(OWNER);
        for (const [action, payload] of [
          ["open-shift", { openingFloatCents: 1.2 }],
          ["update-product", { productId: "paint", sellingPriceCents: 100.5 }],
          ["checkout", { tenderedCents: "NaN" }],
          ["checkout", { items: [{ productId: "paint", quantity: null }] }],
          ["update-stock", { productId: "paint", stockQuantity: 1 }],
          [
            "update-stock",
            { productId: "paint", stockQuantity: 1, expectedVersion: null },
          ],
          [
            "update-stock",
            { productId: "paint", stockQuantity: 1, expectedVersion: 0.5 },
          ],
          [
            "update-stock",
            { productId: "paint", stockQuantity: "NaN", expectedVersion: 0 },
          ],
        ])
          await assert.rejects(
            () => command(action, payload),
            /whole-cent|quantity|current version/,
          );
        await assert.rejects(() => command(null, {}), /Invalid command/);
        await assert.rejects(
          () => command("update-stock", null),
          /Invalid command/,
        );
        await assert.rejects(
          () =>
            db.query(
              "select public.inventory_document_command(null,$1::jsonb,$2)",
              ["{}", crypto.randomUUID()],
            ),
          /Invalid document command/,
        );
        await assert.rejects(
          () =>
            db.query(
              "select private.inventory_document_command_before_corrections($1,$2::jsonb,$3)",
              ["post", "{}", crypto.randomUUID()],
            ),
          /permission denied/,
        );
        await assert.rejects(
          () =>
            db.query(
              "select private.admin_command_before_integrity($1,$2::jsonb,$3)",
              ["open-shift", "{}", crypto.randomUUID()],
            ),
          /permission denied/,
        );
        assert.equal(
          Number(
            (
              await db.query(
                "select on_hand from public.inventory where branch_id='main-store' and product_id='paint'",
              )
            ).rows[0].on_hand,
          ),
          2,
        );
        assert.equal(
          (await db.query("select * from public.cashier_shifts")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "cashier can open own branch shift but cannot access another branch",
      async () => {
        await asUser(CASHIER);
        await assert.rejects(
          () =>
            command("open-shift", {
              locationId: "second-store",
              openingFloatCents: 0,
            }),
          /Permission/,
        );
        shift = (
          await command("open-shift", {
            locationId: "main-store",
            openingFloatCents: 10000,
          })
        ).shift;
        assert.equal(
          (
            await db.query(
              "select * from public.inventory where branch_id='second-store'",
            )
          ).rows.length,
          0,
        );
      },
    );
    await t.test(
      "checkout rolls back all stock when a later item lacks a price",
      async () => {
        await assert.rejects(
          () =>
            command("checkout", {
              locationId: "main-store",
              shiftId: shift.id,
              items: [
                { productId: "paint", quantity: 1 },
                { productId: "no-price", quantity: 1 },
              ],
              paymentMethod: "cash",
              tenderedCents: 20000,
            }),
          /authorised selling price/,
        );
        assert.equal(
          Number(
            (
              await db.query(
                "select on_hand from public.inventory where product_id='paint' and branch_id='main-store'",
              )
            ).rows[0].on_hand,
          ),
          2,
        );
        assert.equal(
          (await db.query("select * from public.sales")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "checkout calculates authoritative cents and VAT, changes only branch stock and safely replays",
      async () => {
        const key = crypto.randomUUID();
        const payload = {
          locationId: "main-store",
          shiftId: shift.id,
          items: [{ productId: "paint", quantity: 1, unitPriceCents: 1 }],
          paymentMethod: "cash",
          tenderedCents: 20000,
        };
        const sale = await command("checkout", payload, key);
        assert.equal(Number(sale.sale.total_cents), 11500);
        assert.equal(Number(sale.sale.vat_cents), 1500);
        assert.equal(Number(sale.sale.change_cents), 8500);
        const retry = await command("checkout", payload, key);
        assert.equal(retry.sale.id, sale.sale.id);
        assert.equal(retry.replayed, true);
        await assert.rejects(
          () => command("checkout", { ...payload, tenderedCents: 25000 }, key),
          /different input/,
        );
        await db.exec("reset role");
        assert.equal(
          Number(
            (
              await db.query(
                "select on_hand from public.inventory where product_id='paint' and branch_id='second-store'",
              )
            ).rows[0].on_hand,
          ),
          10,
        );
        await asUser(CASHIER);
      },
    );
    await t.test(
      "last unit can sell once and overselling leaves balances intact",
      async () => {
        const payload = {
          locationId: "main-store",
          shiftId: shift.id,
          items: [{ productId: "paint", quantity: 1 }],
          paymentMethod: "card",
          reference: "terminal-001",
        };
        await command("checkout", payload);
        await assert.rejects(
          () => command("checkout", payload),
          /Insufficient/,
        );
        assert.equal(
          Number(
            (
              await db.query(
                "select on_hand from public.inventory where branch_id='main-store' and product_id='paint'",
              )
            ).rows[0].on_hand,
          ),
          0,
        );
      },
    );
    await t.test(
      "closing reports opening float, cash sales, total sales and counted discrepancy",
      async () => {
        const result = await command("close-shift", {
          locationId: "main-store",
          shiftId: shift.id,
          countedCashCents: 21400,
        });
        assert.equal(Number(result.shift.expected_cash_cents), 21500);
        assert.equal(Number(result.shift.discrepancy_cents), -100);
        assert.equal(Number(result.totalCents), 23000);
        await assert.rejects(
          () =>
            command("checkout", {
              locationId: "main-store",
              shiftId: shift.id,
              items: [{ productId: "paint", quantity: 1 }],
              paymentMethod: "cash",
            }),
          /Open a shift/,
        );
      },
    );
    await t.test(
      "stock controller cannot read customers or invoices and cannot overwrite a stale count",
      async () => {
        await db.exec(
          `reset role;insert into public.business_records(kind,user_id,data) values('invoices','${CUSTOMER}','{"invoiceNumber":"TEST","status":"sent","total":100,"shareToken":"secret-token","privateNotes":"private"}');`,
        );
        await asUser(STOCK);
        assert.equal(
          (await db.query("select * from public.business_records")).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.profiles")).rows.length,
          1,
        );
        await assert.rejects(
          () =>
            command("update-stock", {
              productId: "paint",
              stockQuantity: 5,
              expectedVersion: 0,
            }),
          /Stock changed/,
        );
      },
    );
    await t.test(
      "customer invoices hide internal notes and private history",
      async () => {
        await asUser(CUSTOMER);
        const result = (
          await db.query("select public.customer_invoices() rows")
        ).rows[0].rows;
        assert.equal(result.length, 1);
        assert.equal(result[0].privateNotes, undefined);
        assert.equal(result[0].shareToken, "secret-token");
      },
    );
    await t.test(
      "owner reports aggregate real transactions and branch transfers preserve the combined balance",
      async () => {
        await asUser(OWNER);
        const summary = (
          await db.query("select public.dashboard_summary('main-store') data")
        ).rows[0].data;
        assert.equal(Number(summary.paidRevenue), 230);
        await command("update-stock", {
          productId: "paint",
          stockQuantity: 5,
          minStock: 2,
          expectedVersion: Number(
            (
              await db.query(
                "select version from public.inventory where branch_id='main-store' and product_id='paint'",
              )
            ).rows[0].version,
          ),
        });
        await command("transfer-stock", {
          productId: "paint",
          quantity: 2,
          toBranchId: "second-store",
        });
        const balances = (
          await db.query(
            "select branch_id,on_hand from public.inventory where product_id='paint' order by branch_id",
          )
        ).rows;
        assert.equal(Number(balances[0].on_hand), 3);
        assert.equal(Number(balances[1].on_hand), 12);
      },
    );
    await t.test(
      "database recalculates invoice totals and payment retries do not duplicate money",
      async () => {
        await asUser(OWNER);
        const created = await command("create-invoice", {
          customerName: "Walk in",
          userId: CUSTOMER,
          total: 1,
          privateNotes: "Internal",
          discountType: "fixed",
          discountValue: 10,
          items: [
            {
              name: "Paint",
              description: "Paint",
              quantity: 2,
              unitPrice: 100,
              taxRate: 15,
              discountType: "percent",
              discountValue: 10,
            },
          ],
        });
        const row = (
          await db.query(
            "select data from public.business_records where id=$1",
            [created.invoiceId],
          )
        ).rows[0].data;
        assert.equal(Number(row.total), 195.5);
        await command("update-invoice", {
          invoiceId: created.invoiceId,
          status: "sent",
        });
        const key = crypto.randomUUID();
        const payment = {
          invoiceId: created.invoiceId,
          amount: 100,
          method: "EFT",
        };
        await command("record-payment", payment, key);
        await command("record-payment", payment, key);
        assert.equal(
          (
            await db.query(
              "select * from public.invoice_payments where invoice_id=$1",
              [created.invoiceId],
            )
          ).rows.length,
          1,
        );
        await assert.rejects(
          () => command("record-payment", { ...payment, amount: 100 }),
          /overpayment/,
        );
        await assert.rejects(
          () =>
            command("update-invoice", {
              invoiceId: created.invoiceId,
              status: "deleted",
            }),
          /Reconcile existing payments/,
        );
      },
    );
    await t.test(
      "reservations change available stock and release safely once",
      async () => {
        await asUser(CASHIER);
        const reservation = await command("reserve-stock", {
          productId: "paint",
          quantity: 1,
          sourceId: "quote-001",
        });
        const balance = (
          await db.query(
            "select on_hand,reserved from public.inventory where branch_id='main-store' and product_id='paint'",
          )
        ).rows[0];
        assert.equal(Number(balance.reserved), 1);
        assert.equal(Number(balance.on_hand), 3);
        await command("release-reservation", {
          reservationId: reservation.reservationId,
        });
        await command("release-reservation", {
          reservationId: reservation.reservationId,
        });
        assert.equal(
          Number(
            (
              await db.query(
                "select reserved from public.inventory where branch_id='main-store' and product_id='paint'",
              )
            ).rows[0].reserved,
          ),
          0,
        );
      },
    );
    await t.test(
      "returns require manager permission, preserve receipt cents across partial returns, and update stock condition",
      async () => {
        await asUser(CASHIER);
        await assert.rejects(
          () =>
            command("refund-sale", {
              locationId: "main-store",
              shiftId: shift.id,
            }),
          /Permission denied/,
        );
        await assert.rejects(
          () =>
            db.query(
              "select private.admin_command_retail_base('close-shift','{}','test-key-0001')",
            ),
          /permission denied/,
        );
        await asUser(OWNER);
        const managerShift = (
          await command("open-shift", {
            locationId: "main-store",
            openingFloatCents: 100000,
          })
        ).shift;
        const original = (
          await db.query(
            "select * from public.sales where payment_method='cash'",
          )
        ).rows[0];
        const item = (
          await db.query("select * from public.sale_items where sale_id=$1", [
            original.id,
          ])
        ).rows[0];
        const payload = {
          locationId: "main-store",
          shiftId: managerShift.id,
          saleId: original.id,
          paymentMethod: "cash",
          reason: "Returned paint",
          items: [
            { saleItemId: item.id, quantity: 0.333, disposition: "quarantine" },
          ],
        };
        await assert.rejects(
          () => command("refund-sale", { ...payload, paymentMethod: "card" }),
          /original payment method/,
        );
        const key = crypto.randomUUID();
        const first = await command("refund-sale", payload, key);
        assert.equal(
          (await command("refund-sale", payload, key)).return.id,
          first.return.id,
        );
        await command("refund-sale", payload);
        await command("refund-sale", {
          ...payload,
          items: [
            { saleItemId: item.id, quantity: 0.334, disposition: "sellable" },
          ],
        });
        await assert.rejects(
          () => command("refund-sale", payload),
          /exceeds the quantity sold/,
        );
        const totals = (
          await db.query(
            "select sum(total_cents) total,sum(vat_cents) vat,sum(quantity) qty from public.sale_return_items where sale_item_id=$1",
            [item.id],
          )
        ).rows[0];
        assert.equal(Number(totals.total), 11500);
        assert.equal(Number(totals.vat), 1500);
        assert.equal(Number(totals.qty), 1);
        const stock = (
          await db.query(
            "select on_hand,quarantined from public.inventory where branch_id='main-store' and product_id='paint'",
          )
        ).rows[0];
        assert.equal(Number(stock.on_hand), 4);
        assert.equal(Number(stock.quarantined), 0.666);
        await command("cash-movement", {
          locationId: "main-store",
          shiftId: managerShift.id,
          direction: "out",
          category: "banking",
          amountCents: 5000,
          reason: "Bank deposit",
        });
        await command("cash-movement", {
          locationId: "main-store",
          shiftId: managerShift.id,
          direction: "in",
          category: "float",
          amountCents: 1000,
          reason: "Extra float",
        });
        await assert.rejects(
          () =>
            command("cash-movement", {
              shiftId: managerShift.id,
              direction: "out",
              category: "expense",
              amountCents: 1000000,
              reason: "Too much cash",
            }),
          /exceeds expected/,
        );
        await assert.rejects(
          () =>
            command("cash-movement", {
              shiftId: managerShift.id,
              direction: "in",
              category: "float",
              amountCents: 1.2,
              reason: "Invalid cents",
            }),
          /valid cash|whole-cent/,
        );
        const summary = (
          await db.query("select public.shift_summary($1) data", [
            managerShift.id,
          ])
        ).rows[0].data;
        assert.equal(Number(summary.expectedCashCents), 84500);
        assert.equal(Number(summary.netSalesCents), -11500);
        const closed = await command("close-shift", {
          locationId: "main-store",
          shiftId: managerShift.id,
          countedCashCents: 84400,
        });
        assert.equal(Number(closed.shift.discrepancy_cents), -100);
        const prior = (
          await db.query("select public.pos_shift_document($1) data", [
            shift.id,
          ])
        ).rows[0].data;
        assert.equal(Number(prior.shift.expected_cash_cents), 21500);
        assert.equal(Number(prior.totals.salesCents), 23000);
        await assert.rejects(
          () =>
            command("cash-movement", {
              shiftId: managerShift.id,
              direction: "in",
              category: "float",
              amountCents: 1,
              reason: "Closed shift",
            }),
          /Open a shift/,
        );
        const book = (
          await db.query(
            "select public.accounting_book('main-store',(now() at time zone 'Africa/Johannesburg')::date,(now() at time zone 'Africa/Johannesburg')::date) data",
          )
        ).rows[0].data;
        assert.equal(Number(book.totals.netSalesCents), 11500);
        assert.equal(Number(book.totals.netVatCents), 1500);
        assert.equal(Number(book.totals.netExVatCents), 10000);
        assert.equal(Number(book.totals.cashCents), 0);
        assert.equal(Number(book.totals.cardCents), 11500);
        assert.equal(
          Number(book.totals.cashCents) +
            Number(book.totals.cardCents) +
            Number(book.totals.eftCents),
          Number(book.totals.netSalesCents),
        );
        assert.equal(book.returns.length, 3);
        assert.equal(book.cashMovements.length, 2);
        assert.equal(book.sales.length, 2);
        assert.equal(book.invoiceCollections.length, 1);
        await assert.rejects(
          () =>
            db.query(
              "select public.accounting_book('main-store','2026-01-01','2026-03-01')",
            ),
          /31 days/,
        );
        await asUser(CUSTOMER);
        await assert.rejects(
          () =>
            db.query(
              "select public.accounting_book('main-store',current_date,current_date)",
            ),
          /Branch access/,
        );
        assert.equal(
          (
            await db.query("select public.pos_shift_document($1) data", [
              shift.id,
            ])
          ).rows[0].data,
          null,
        );
        assert.equal(
          (await db.query("select * from public.sale_returns")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "inspection releases quarantine and writes off damaged stock with version and retry guards",
      async () => {
        await asUser(OWNER);
        const inspect = async (payload, key = crypto.randomUUID()) =>
          (
            await db.query(
              "select public.inventory_disposition($1::jsonb,$2) result",
              [JSON.stringify(payload), key],
            )
          ).rows[0].result;
        let stock = (
          await db.query(
            "select * from public.inventory where product_id='paint' and branch_id='main-store'",
          )
        ).rows[0];
        const payload = {
          locationId: "main-store",
          productId: "paint",
          expectedVersion: Number(stock.version),
          mode: "release",
          bucket: "quarantined",
          quantity: 0.333,
          reason: "Passed inspection",
        };
        const key = crypto.randomUUID();
        await inspect(payload, key);
        assert.equal((await inspect(payload, key)).replayed, true);
        await assert.rejects(() => inspect(payload), /Stock changed/);
        stock = (
          await db.query(
            "select * from public.inventory where product_id='paint' and branch_id='main-store'",
          )
        ).rows[0];
        assert.equal(Number(stock.quarantined), 0.333);
        assert.equal(Number(stock.on_hand), 4);
        await inspect({
          ...payload,
          expectedVersion: Number(stock.version),
          mode: "hold",
          bucket: "damaged",
          quantity: 0.5,
          reason: "Damaged container",
        });
        await inspect({
          ...payload,
          expectedVersion: Number(stock.version) + 1,
          mode: "writeoff",
          bucket: "damaged",
          quantity: 0.5,
          reason: "Approved disposal",
        });
        stock = (
          await db.query(
            "select * from public.inventory where product_id='paint' and branch_id='main-store'",
          )
        ).rows[0];
        assert.equal(Number(stock.damaged), 0);
        assert.equal(Number(stock.on_hand), 3.5);
        await asUser(CASHIER);
        await assert.rejects(
          () => inspect({ ...payload, expectedVersion: Number(stock.version) }),
          /Permission denied/,
        );
      },
    );
    await t.test(
      "register bootstrap and barcode lookup return authoritative branch stock in one bounded call",
      async () => {
        await asUser(OWNER);
        const register = (
          await db.query(
            "select public.pos_register('main-store','P001','{}',false) result",
          )
        ).rows[0].result;
        assert.equal(register.products.length, 1);
        assert.equal(register.products[0].id, "paint");
        assert.equal(Number(register.products[0].available), 3.167);
        assert.equal(register.branches.length, 2);
        assert.equal(register.products[0].cost_price_cents, undefined);
        await asUser(CASHIER);
        await assert.rejects(
          () => db.query("select public.pos_register('second-store')"),
          /Branch access/,
        );
        await asUser(CUSTOMER);
        await assert.rejects(
          () => db.query("select public.pos_register()"),
          /Branch access/,
        );
      },
    );
    await t.test(
      "slip drafts, duplicate checks, atomic purchases, physical sales, payments and monthly books reconcile",
      async () => {
        await asUser(OWNER);
        const dc = async (action, payload, key = crypto.randomUUID()) =>
          (
            await db.query(
              "select public.inventory_document_command($1,$2::jsonb,$3) result",
              [action, JSON.stringify(payload), key],
            )
          ).rows[0].result;
        const stock = async () =>
          (
            await db.query(
              "select * from public.inventory where branch_id='main-store' and product_id='paint'",
            )
          ).rows[0];
        const today = (
          await db.query(
            "select (now() at time zone 'Africa/Johannesburg')::date::text as business_day",
          )
        ).rows[0].business_day;
        const month = today.slice(0, 7) + "-01";
        const before = await stock();
        const data = {
          counterparty: "Supplier Example",
          reference: "SUP-001",
          documentDate: today,
          currency: "ZAR",
          stockEffect: "apply",
          linkedSaleId: "",
          sourceSha256: "a".repeat(64),
          sourceName: "sample.png",
          rawText: "SAMPLE ONLY",
          confidence: 90,
          items: [
            {
              id: "one",
              description: "Paint tin",
              productId: "paint",
              quantity: 10,
              unitPriceCents: 2300,
              discountCents: 0,
              stockVersion: Number(before.version),
            },
          ],
          chargesCents: 0,
          discountCents: 0,
          roundingCents: 0,
          vatCents: 3000,
          declaredTotalCents: 23000,
          paidCents: 5000,
          paymentMethod: "cash",
          paymentReference: "",
          warnings: [],
        };
        const id = crypto.randomUUID(),
          saveKey = crypto.randomUUID(),
          payload = {
            id,
            locationId: "main-store",
            kind: "purchase",
            expectedVersion: 0,
            data,
          };
        let draft = await dc("save", payload, saveKey);
        assert.equal(Number((await stock()).on_hand), 3.5);
        assert.equal((await dc("save", payload, saveKey)).replayed, true);
        await assert.rejects(
          () =>
            dc(
              "save",
              { ...payload, data: { ...data, reference: "OTHER" } },
              saveKey,
            ),
          /different input/,
        );
        await assert.rejects(() => dc("save", payload), /another window/);
        await assert.rejects(
          () =>
            dc("post", { id, expectedVersion: draft.version, reviewed: false }),
          /Confirm/,
        );
        draft = await dc("save", {
          ...payload,
          expectedVersion: draft.version,
          data: { ...data, declaredTotalCents: 23001 },
        });
        await assert.rejects(
          () =>
            dc("post", { id, expectedVersion: draft.version, reviewed: true }),
          /calculated lines/,
        );
        draft = await dc("save", {
          ...payload,
          expectedVersion: draft.version,
          data: {
            ...data,
            items: [
              { ...data.items[0], stockVersion: Number(before.version) - 1 },
            ],
          },
        });
        await assert.rejects(
          () =>
            dc("post", { id, expectedVersion: draft.version, reviewed: true }),
          /Stock changed/,
        );
        assert.equal(Number((await stock()).on_hand), 3.5);
        draft = await dc("save", {
          ...payload,
          expectedVersion: draft.version,
          data,
        });
        const postKey = crypto.randomUUID(),
          postPayload = { id, expectedVersion: draft.version, reviewed: true };
        assert.equal((await dc("post", postPayload, postKey)).status, "posted");
        assert.equal((await dc("post", postPayload, postKey)).replayed, true);
        assert.equal((await dc("post", postPayload)).replayed, true);
        assert.equal(Number((await stock()).on_hand), 13.5);
        await assert.rejects(
          () => dc("save", { ...payload, expectedVersion: draft.version }),
          /Only drafts/,
        );
        const payment = {
            id,
            amountCents: 10000,
            method: "eft",
            reference: "SUP-PAY-001",
            paidOn: today,
          },
          paymentKey = crypto.randomUUID();
        await dc("payment", payment, paymentKey);
        await dc("payment", payment, paymentKey);
        await assert.rejects(
          () => dc("payment", { ...payment, amountCents: 1000 }),
          /already recorded/,
        );
        await assert.rejects(
          () =>
            dc("payment", {
              ...payment,
              reference: "SUP-PAY-002",
              amountCents: 100000,
            }),
          /overpayment/,
        );
        const duplicateId = crypto.randomUUID(),
          duplicate = await dc("save", {
            ...payload,
            id: duplicateId,
            data: {
              ...data,
              reference: "DIFFERENT-REF",
              items: [
                {
                  ...data.items[0],
                  stockVersion: Number((await stock()).version),
                },
              ],
            },
          });
        await assert.rejects(
          () =>
            dc("post", {
              id: duplicateId,
              expectedVersion: duplicate.version,
              reviewed: true,
            }),
          /already recorded/,
        );
        await dc("archive", { id: duplicateId });
        await dc("restore", { id: duplicateId });
        const saleId = crypto.randomUUID(),
          saleData = {
            ...data,
            counterparty: "Walk-in customer",
            reference: "PHYS-001",
            sourceSha256: "b".repeat(64),
            items: [
              {
                ...data.items[0],
                quantity: 2,
                unitPriceCents: 15000,
                stockVersion: Number((await stock()).version),
              },
            ],
            declaredTotalCents: 30000,
            vatCents: 3913,
            paidCents: 30000,
          };
        const saleDraft = await dc("save", {
          ...payload,
          id: saleId,
          kind: "physical_sale",
          data: saleData,
        });
        await dc("post", {
          id: saleId,
          expectedVersion: saleDraft.version,
          reviewed: true,
        });
        assert.equal(Number((await stock()).on_hand), 11.5);
        const countedId = crypto.randomUUID(),
          countedData = {
            ...saleData,
            reference: "PHYS-002",
            sourceSha256: "c".repeat(64),
            stockEffect: "already_counted",
            items: [
              { ...saleData.items[0], quantity: 1, unitPriceCents: 11500 },
            ],
            declaredTotalCents: 11500,
            vatCents: 1500,
            paidCents: 0,
            paymentMethod: "credit",
          };
        const countedDraft = await dc("save", {
          ...payload,
          id: countedId,
          kind: "physical_sale",
          data: countedData,
        });
        await dc("post", {
          id: countedId,
          expectedVersion: countedDraft.version,
          reviewed: true,
        });
        assert.equal(Number((await stock()).on_hand), 11.5);
        const original = (
            await db.query(
              "select * from public.sales where payment_method='cash'",
            )
          ).rows[0],
          verifyId = crypto.randomUUID();
        const verification = {
          ...countedData,
          reference: original.receipt_number,
          sourceSha256: "d".repeat(64),
          stockEffect: "apply",
          linkedSaleId: original.id,
        };
        let verifyDraft = await dc("save", {
          ...payload,
          id: verifyId,
          kind: "physical_sale",
          data: verification,
        });
        await assert.rejects(
          () =>
            dc("post", {
              id: verifyId,
              expectedVersion: verifyDraft.version,
              reviewed: true,
            }),
          /already in POS/,
        );
        verifyDraft = await dc("save", {
          ...payload,
          id: verifyId,
          kind: "physical_sale",
          expectedVersion: verifyDraft.version,
          data: { ...verification, stockEffect: "verify_pos" },
        });
        assert.equal(
          (
            await dc("post", {
              id: verifyId,
              expectedVersion: verifyDraft.version,
              reviewed: true,
            })
          ).status,
          "verified",
        );
        assert.equal(Number((await stock()).on_hand), 11.5);
        await dc("budget", {
          locationId: "main-store",
          month,
          amountCents: 20000,
        });
        const report = (
          await db.query("select public.inventory_month($1,$2) data", [
            "main-store",
            month,
          ])
        ).rows[0].data;
        assert.equal(Number(report.purchasesCents), 23000);
        assert.equal(Number(report.spentCents), 15000);
        assert.equal(Number(report.supplierBalanceCents), 8000);
        assert.equal(Number(report.physicalSalesCents), 41500);
        assert.equal(Number(report.budgetCents), 20000);
        const paint = report.products.find((p) => p.id === "paint");
        assert.equal(Number(paint.received), 10);
        assert.equal(Number(paint.slip_applied_sold), 2);
        assert.equal(Number(paint.documented_slip_sold), 3);
        assert.equal(Number(paint.closing), 11.5);
        assert.equal(
          Number(paint.opening) +
            Number(paint.received) +
            Number(paint.returned) -
            Number(paint.pos_sold) -
            Number(paint.slip_applied_sold) +
            Number(paint.other),
          Number(paint.closing),
        );
        assert.equal(Number(paint.last_purchase_unit_cents), 2300);
        const book = (
          await db.query("select public.accounting_book($1,$2,$2) data", [
            "main-store",
            today,
          ])
        ).rows[0].data;
        assert.equal(Number(book.slipBook.salesCents), 41500);
        assert.equal(Number(book.slipBook.supplierPaymentsCents), 15000);
        assert.equal(Number(book.slipBook.externalReceiptsCents), 30000);
        assert.equal(book.slipBook.documents.length, 3);
        // Cancellation corrects active books and stock, retaining original evidence.
        const getDoc = async (docId) =>
          (
            await db.query(
              "select * from public.inventory_documents where id=$1",
              [docId],
            )
          ).rows[0];
        const purchase = await getDoc(id);
        const cancel = {
          id,
          expectedVersion: Number(purchase.version),
          expectedPaidCents: 15000,
          reason: "Wrong supplier invoice entered",
          confirmed: true,
        };
        await assert.rejects(
          () => dc("void", { ...cancel, confirmed: false }),
          /Confirm/,
        );
        await assert.rejects(
          () => dc("void", { ...cancel, expectedPaidCents: 0 }),
          /payments changed/,
        );
        await asUser(CASHIER);
        await assert.rejects(() => dc("void", cancel), /manager/);
        await asUser(STOCK);
        await assert.rejects(() => dc("void", cancel), /payment manager/);
        await asUser(OWNER);
        const reserved = Number((await stock()).reserved);
        await db.exec(
          "reset role;update public.inventory set reserved=2 where branch_id='main-store' and product_id='paint'",
        );
        await asUser(OWNER);
        await assert.rejects(() => dc("void", cancel), /Cannot cancel/);
        assert.equal((await getDoc(id)).status, "posted");
        assert.equal(Number((await stock()).on_hand), 11.5);
        await db.query("reset role");
        await db.query(
          "update public.inventory set reserved=$1 where branch_id='main-store' and product_id='paint'",
          [reserved],
        );
        await asUser(OWNER);
        const cancelKey = crypto.randomUUID();
        assert.equal((await dc("void", cancel, cancelKey)).status, "void");
        assert.equal((await dc("void", cancel, cancelKey)).replayed, true);
        assert.equal((await dc("void", cancel)).replayed, true);
        assert.equal(Number((await stock()).on_hand), 1.5);
        assert.equal(
          (
            await db.query(
              "select * from public.stock_movements where source_document_id=$1 and reason='Slip correction'",
              [id],
            )
          ).rows.length,
          1,
        );
        assert.equal(
          (
            await db.query(
              "select * from public.inventory_document_payments where document_id=$1",
              [id],
            )
          ).rows.length,
          2,
        );
        assert.equal((await getDoc(id)).void_reason, cancel.reason);
        await assert.rejects(
          () =>
            dc("payment", { ...payment, amountCents: 100, reference: "NEW" }),
          /cannot accept/,
        );
        await assert.rejects(
          () =>
            dc("post", {
              id,
              expectedVersion: purchase.version,
              reviewed: true,
            }),
          /latest saved draft/,
        );
        const afterCancel = (
          await db.query("select public.inventory_month($1,$2) data", [
            "main-store",
            month,
          ])
        ).rows[0].data;
        assert.equal(Number(afterCancel.purchasesCents), 0);
        assert.equal(Number(afterCancel.spentCents), 0);
        assert.equal(Number(afterCancel.supplierBalanceCents), 0);
        assert.equal(
          afterCancel.products.find((p) => p.id === "paint")
            .last_purchase_unit_cents,
          null,
        );
        assert.equal(
          (
            await db.query(
              "select active from public.inventory_product_aliases where counterparty='supplier example'",
            )
          ).rows[0].active,
          false,
        );
        for (const docId of [saleId, countedId, verifyId]) {
          const old = await getDoc(docId),
            oldPaid = Number(
              (
                await db.query(
                  "select coalesce(sum(amount_cents),0) amount from public.inventory_document_payments where document_id=$1",
                  [docId],
                )
              ).rows[0].amount,
            );
          await dc("void", {
            id: docId,
            expectedVersion: Number(old.version),
            expectedPaidCents: oldPaid,
            reason: "Incorrect slip, preparing correction",
            confirmed: true,
          });
        }
        assert.equal(Number((await stock()).on_hand), 3.5);
        assert.equal(
          Number(
            (
              await db.query(
                "select total_cents from public.sales where id=$1",
                [original.id],
              )
            ).rows[0].total_cents,
          ),
          Number(original.total_cents),
        );
        const cancelledBook = (
          await db.query("select public.accounting_book($1,$2,$2) data", [
            "main-store",
            today,
          ])
        ).rows[0].data;
        assert.equal(Number(cancelledBook.slipBook.salesCents), 0);
        assert.equal(Number(cancelledBook.slipBook.externalReceiptsCents), 0);
        assert.equal(cancelledBook.slipBook.documents.length, 0);
        const correctedId = crypto.randomUUID(),
          corrected = await dc("save", {
            ...payload,
            id: correctedId,
            data: {
              ...data,
              items: [
                {
                  ...data.items[0],
                  stockVersion: Number((await stock()).version),
                },
              ],
            },
          });
        const correctedPost = await dc("post", {
          id: correctedId,
          expectedVersion: corrected.version,
          reviewed: true,
        });
        assert.equal(correctedPost.status, "posted");
        assert.equal(
          (
            await db.query(
              "select active from public.inventory_product_aliases where counterparty='supplier example'",
            )
          ).rows[0].active,
          true,
        );
        await dc("void", {
          id: correctedId,
          expectedVersion: correctedPost.version,
          expectedPaidCents: data.paidCents,
          reason: "Test correction cleanup",
          confirmed: true,
        });
        const correctedMonth = (
          await db.query("select public.inventory_month($1,$2) data", [
            "main-store",
            month,
          ])
        ).rows[0].data;
        const correctedPaint = correctedMonth.products.find(
          (p) => p.id === "paint",
        );
        assert.equal(
          Number(correctedPaint.opening) +
            Number(correctedPaint.received) +
            Number(correctedPaint.returned) -
            Number(correctedPaint.pos_sold) -
            Number(correctedPaint.slip_applied_sold) +
            Number(correctedPaint.other),
          Number(correctedPaint.closing),
        );
        assert.equal(Number(correctedPaint.documented_slip_sold), 0);
        await asUser(CASHIER);
        assert.equal(
          (
            await db.query(
              "select * from public.inventory_documents where kind='purchase'",
            )
          ).rows.length,
          0,
        );
        await assert.rejects(
          () =>
            dc("save", {
              ...payload,
              id: crypto.randomUUID(),
              kind: "physical_sale",
            }),
          /manager/,
        );
        const hidden = (
          await db.query("select public.inventory_month($1,$2) data", [
            "main-store",
            month,
          ])
        ).rows[0].data;
        assert.equal(hidden.spentCents, null);
        assert.equal(
          hidden.products.find((p) => p.id === "paint")
            .last_purchase_unit_cents,
          null,
        );
        await asUser(CUSTOMER);
        await assert.rejects(
          () => dc("save", { ...payload, id: crypto.randomUUID() }),
          /manager/,
        );
      },
    );
    await t.test(
      "a revoked session loses operational authority while its old JWT identity remains",
      async () => {
        await db.exec(
          `reset role;delete from auth.sessions where user_id='${CASHIER}'`,
        );
        await asUser(CASHIER);
        await assert.rejects(
          () => command("open-shift", { openingFloatCents: 0 }),
          /Permission denied/,
        );
        assert.equal(
          (await db.query("select * from public.inventory")).rows.length,
          0,
        );
      },
    );
    await t.test(
      "anonymous role can read safe catalogue and shared invoice only",
      async () => {
        await db.exec(
          "reset role;set role anon;select set_config('request.jwt.claim.sub','',false)",
        );
        const products = (
          await db.query("select public.catalogue_products() rows")
        ).rows[0].rows;
        assert.equal(products[0].selling_price_cents, undefined);
        await assert.rejects(
          () => db.query("select * from public.profiles"),
          /permission denied/,
        );
        await assert.rejects(
          () => command("open-shift", { openingFloatCents: 0 }),
          /permission denied/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
