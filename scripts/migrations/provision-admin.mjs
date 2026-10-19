/** Provision the explicitly configured admin identity in the intended Supabase project. */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const username = process.env.TRUECOLOURS_ADMIN_USERNAME || "admin123";
const email =
  process.env.TRUECOLOURS_ADMIN_LOGIN_EMAIL || "admin123@truecolours.internal";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const password = process.env.TRUECOLOURS_ADMIN_PASSWORD;
const secret = process.env.SUPABASE_SECRET_KEY;
if (
  !url ||
  !projectRef ||
  new URL(url).hostname !== `${projectRef}.supabase.co`
)
  throw new Error(
    "Configure the new Supabase project URL and matching SUPABASE_PROJECT_REF before provisioning.",
  );
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      dryRun: true,
      projectRef,
      username,
      role: "administrator",
      passwordConfigured: Boolean(password),
    }),
  );
  process.exit(0);
}
if (!secret || !password)
  throw new Error(
    "Provisioning requires server-only SUPABASE_SECRET_KEY and TRUECOLOURS_ADMIN_PASSWORD.",
  );
const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const check = (result) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};
let existing;
for (let page = 1; ; page++) {
  const result = check(await db.auth.admin.listUsers({ page, perPage: 1000 }));
  existing = result.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing || result.users.length < 1000) break;
}
if (existing && existing.app_metadata?.truecolours_admin_username !== username)
  throw new Error(
    "This email already belongs to an account not managed by this setup script. Reconcile it explicitly before changing its credentials.",
  );
let user;
if (existing) {
  user = check(
    await db.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    }),
  ).user;
} else
  user = check(
    await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { truecolours_admin_username: username },
      user_metadata: { display_name: "TRUECOLOURS Administrator" },
    }),
  ).user;
const staff = check(
  await db.from("staff").select("*").eq("user_id", user.id).maybeSingle(),
);
check(
  await db
    .from("staff")
    .upsert(
      {
        user_id: user.id,
        name: "TRUECOLOURS Administrator",
        role: staff?.role === "owner" ? "owner" : "administrator",
        branch_ids: staff?.branch_ids?.length
          ? staff.branch_ids
          : ["main-store"],
        active: true,
        session_version: Number(staff?.session_version || 0) + 1,
      },
      { onConflict: "user_id" },
    ),
);
console.log(
  JSON.stringify({
    provisioned: true,
    projectRef,
    username,
    passwordLogged: false,
  }),
);
