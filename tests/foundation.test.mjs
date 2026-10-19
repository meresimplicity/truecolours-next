import test from "node:test";
import assert from "node:assert/strict";
import {
  hasPermission,
  normalizeBusinessRole,
  permissions,
  permissionsForRole,
} from "../lib/business/permissions.ts";
import {
  availableInventoryStock,
  hasInventoryVersionConflict,
} from "../lib/business/inventory-types.ts";
import {
  allocateManualPayment,
  changeReservedInventory,
} from "../lib/business/transactional-guards.ts";

test("owner has every declared permission", () => {
  assert.deepEqual(new Set(permissionsForRole("owner")), new Set(permissions));
});

test("operational roles receive only their intended inventory authority", () => {
  assert.equal(hasPermission("stock_controller", "inventory.adjust"), true);
  assert.equal(hasPermission("cashier", "inventory.adjust"), false);
  assert.equal(hasPermission("cashier", "pos.use"), true);
  assert.equal(hasPermission("accountant", "settings.manage"), false);
});

test("legacy Firebase roles map into the expanded role model", () => {
  assert.equal(normalizeBusinessRole("super_admin"), "owner");
  assert.equal(normalizeBusinessRole("staff"), "manager");
  assert.equal(normalizeBusinessRole("sales"), "salesperson");
  assert.equal(normalizeBusinessRole("unknown"), "customer");
});

test("available stock excludes reserved and non-sellable buckets", () => {
  assert.equal(availableInventoryStock({
    onHand: 20,
    reserved: 3,
    damaged: 2,
    returned: 1,
    quarantined: 4,
  }), 10);
});

test("available stock cannot become negative and rounds to three decimals", () => {
  assert.equal(availableInventoryStock({
    onHand: 1,
    reserved: 2,
    damaged: 0,
    returned: 0,
    quarantined: 0,
  }), 0);
  assert.equal(availableInventoryStock({
    onHand: 2.5555,
    reserved: 0.1111,
    damaged: 0,
    returned: 0,
    quarantined: 0,
  }), 2.444);
});

test("offline inventory counts stop when the server balance version changed", () => {
  assert.equal(hasInventoryVersionConflict(undefined, 4), false);
  assert.equal(hasInventoryVersionConflict(4, 4), false);
  assert.equal(hasInventoryVersionConflict(3, 4), true);
});

test("manual invoice payments allocate exact cents and support partial settlement", () => {
  assert.deepEqual(allocateManualPayment(100.05, 20, 30.05), {
    amountPaid: 50.05,
    balanceDue: 50,
    paidInFull: false,
  });
  assert.deepEqual(allocateManualPayment(100.05, 50.05, 50), {
    amountPaid: 100.05,
    balanceDue: 0,
    paidInFull: true,
  });
});

test("manual invoice payments reject overpayment and already-paid invoices", () => {
  assert.throws(() => allocateManualPayment(100, 90, 10.01), /exceeds the outstanding balance/);
  assert.throws(() => allocateManualPayment(100, 100, 1), /already been paid/);
});

test("a final available unit can be reserved once and no further", () => {
  const balance = { onHand: 1, reserved: 0, incoming: 0, damaged: 0, returned: 0, quarantined: 0, available: 1 };
  const reserved = changeReservedInventory(balance, 1);
  assert.equal(reserved.onHand, 1);
  assert.equal(reserved.reserved, 1);
  assert.equal(reserved.available, 0);
  assert.throws(() => changeReservedInventory(reserved, 1), /not enough available inventory/);
});

test("releasing a reservation restores available stock without changing on hand", () => {
  const balance = { onHand: 5, reserved: 2, incoming: 0, damaged: 0, returned: 0, quarantined: 0, available: 3 };
  const released = changeReservedInventory(balance, -2);
  assert.equal(released.onHand, 5);
  assert.equal(released.reserved, 0);
  assert.equal(released.available, 5);
  assert.throws(() => changeReservedInventory(released, -1), /cannot become negative/);
});
