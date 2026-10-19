export const businessRoles = [
  "owner",
  "administrator",
  "manager",
  "cashier",
  "salesperson",
  "stock_controller",
  "accountant",
  "customer",
] as const;

export type BusinessRole = (typeof businessRoles)[number];

export const permissions = [
  "dashboard.read",
  "pos.use",
  "sales.read",
  "sales.create",
  "sales.manage",
  "sales.cancel",
  "sales.discount",
  "returns.manage",
  "payments.record",
  "inventory.read",
  "inventory.adjust",
  "inventory.count",
  "inventory.transfer",
  "products.read",
  "products.manage",
  "products.cost.read",
  "purchasing.read",
  "purchasing.manage",
  "customers.read",
  "customers.manage",
  "customers.credit.manage",
  "documents.read",
  "documents.manage",
  "reports.read",
  "reports.export",
  "staff.read",
  "staff.roles.manage",
  "devices.read",
  "devices.manage",
  "cash_drawer.open",
  "settings.manage",
  "audit.read",
] as const;

export type Permission = (typeof permissions)[number];

const allPermissions = new Set<Permission>(permissions);

const rolePermissions: Record<BusinessRole, ReadonlySet<Permission>> = {
  owner: allPermissions,
  administrator: allPermissions,
  manager: new Set<Permission>([
    "dashboard.read",
    "pos.use",
    "sales.read",
    "sales.create",
    "sales.manage",
    "sales.cancel",
    "sales.discount",
    "returns.manage",
    "payments.record",
    "inventory.read",
    "inventory.adjust",
    "inventory.count",
    "inventory.transfer",
    "products.read",
    "products.manage",
    "products.cost.read",
    "purchasing.read",
    "purchasing.manage",
    "customers.read",
    "customers.manage",
    "documents.read",
    "documents.manage",
    "reports.read",
    "reports.export",
    "staff.read",
    "devices.read",
    "cash_drawer.open",
    "audit.read",
  ]),
  cashier: new Set<Permission>([
    "dashboard.read",
    "pos.use",
    "sales.read",
    "sales.create",
    "sales.manage",
    "payments.record",
    "inventory.read",
    "products.read",
    "customers.read",
    "customers.manage",
    "documents.read",
  ]),
  salesperson: new Set<Permission>([
    "dashboard.read",
    "pos.use",
    "sales.read",
    "sales.create",
    "sales.discount",
    "payments.record",
    "inventory.read",
    "products.read",
    "customers.read",
    "customers.manage",
    "documents.read",
    "documents.manage",
    "reports.read",
  ]),
  stock_controller: new Set<Permission>([
    "dashboard.read",
    "inventory.read",
    "inventory.adjust",
    "inventory.count",
    "inventory.transfer",
    "products.read",
    "products.manage",
    "products.cost.read",
    "purchasing.read",
    "purchasing.manage",
    "reports.read",
    "reports.export",
    "devices.read",
    "audit.read",
  ]),
  accountant: new Set<Permission>([
    "dashboard.read",
    "sales.read",
    "returns.manage",
    "payments.record",
    "inventory.read",
    "products.read",
    "products.cost.read",
    "purchasing.read",
    "customers.read",
    "customers.credit.manage",
    "documents.read",
    "documents.manage",
    "reports.read",
    "reports.export",
    "audit.read",
  ]),
  customer: new Set<Permission>(),
};

export function hasPermission(role: BusinessRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export function permissionsForRole(role: BusinessRole) {
  return [...rolePermissions[role]];
}

/** Maps the roles already stored in Firebase onto the expanded retail role model. */
export function normalizeBusinessRole(value: unknown): BusinessRole {
  switch (value) {
    case "super_admin":
    case "owner":
      return "owner";
    case "admin":
    case "administrator":
      return "administrator";
    case "staff":
    case "manager":
      return "manager";
    case "sales":
    case "salesperson":
      return "salesperson";
    case "cashier":
    case "stock_controller":
    case "accountant":
    case "customer":
      return value;
    default:
      return "customer";
  }
}
