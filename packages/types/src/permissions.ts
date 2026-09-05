import { RoleName } from './enums';

/** Every permission key recognised by the authorisation guards. */
export const Permission = {
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_WRITE: 'customers.write',
  APPLICATIONS_READ: 'applications.read',
  APPLICATIONS_WRITE: 'applications.write',
  APPLICATIONS_APPROVE: 'applications.approve',
  SUBSCRIPTIONS_READ: 'subscriptions.read',
  SUBSCRIPTIONS_WRITE: 'subscriptions.write',
  PLANS_READ: 'plans.read',
  PLANS_WRITE: 'plans.write',
  PLANS_PUBLISH: 'plans.publish',
  COVERAGE_READ: 'coverage.read',
  COVERAGE_WRITE: 'coverage.write',
  INVOICES_READ: 'invoices.read',
  INVOICES_WRITE: 'invoices.write',
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_REFUND: 'payments.refund',
  TICKETS_READ: 'tickets.read',
  TICKETS_ASSIGN: 'tickets.assign',
  TICKETS_RESOLVE: 'tickets.resolve',
  CALLBACKS_READ: 'callbacks.read',
  CALLBACKS_WRITE: 'callbacks.write',
  CONTENT_READ: 'content.read',
  CONTENT_WRITE: 'content.write',
  CONTENT_PUBLISH: 'content.publish',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_LOGS_READ: 'audit_logs.read',
  ANALYTICS_READ: 'analytics.read',
  SETTINGS_MANAGE: 'settings.manage',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

export interface PermissionDefinition {
  key: Permission;
  label: string;
  group: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: Permission.CUSTOMERS_READ, label: 'View customers', group: 'Customers' },
  { key: Permission.CUSTOMERS_WRITE, label: 'Create and edit customers', group: 'Customers' },
  { key: Permission.APPLICATIONS_READ, label: 'View applications', group: 'Applications' },
  { key: Permission.APPLICATIONS_WRITE, label: 'Edit applications', group: 'Applications' },
  {
    key: Permission.APPLICATIONS_APPROVE,
    label: 'Approve or reject applications',
    group: 'Applications',
  },
  { key: Permission.SUBSCRIPTIONS_READ, label: 'View subscriptions', group: 'Subscriptions' },
  { key: Permission.SUBSCRIPTIONS_WRITE, label: 'Change subscriptions', group: 'Subscriptions' },
  { key: Permission.PLANS_READ, label: 'View plans', group: 'Catalog' },
  { key: Permission.PLANS_WRITE, label: 'Create and edit plans', group: 'Catalog' },
  { key: Permission.PLANS_PUBLISH, label: 'Publish plans and pricing', group: 'Catalog' },
  { key: Permission.COVERAGE_READ, label: 'View coverage', group: 'Coverage' },
  { key: Permission.COVERAGE_WRITE, label: 'Manage coverage', group: 'Coverage' },
  { key: Permission.INVOICES_READ, label: 'View invoices', group: 'Billing' },
  { key: Permission.INVOICES_WRITE, label: 'Create and adjust invoices', group: 'Billing' },
  { key: Permission.PAYMENTS_READ, label: 'View payments', group: 'Billing' },
  { key: Permission.PAYMENTS_REFUND, label: 'Issue refunds', group: 'Billing' },
  { key: Permission.TICKETS_READ, label: 'View tickets', group: 'Support' },
  { key: Permission.TICKETS_ASSIGN, label: 'Assign tickets', group: 'Support' },
  { key: Permission.TICKETS_RESOLVE, label: 'Resolve and close tickets', group: 'Support' },
  { key: Permission.CALLBACKS_READ, label: 'View callback requests', group: 'Support' },
  { key: Permission.CALLBACKS_WRITE, label: 'Manage callback requests', group: 'Support' },
  { key: Permission.CONTENT_READ, label: 'View content', group: 'Content' },
  { key: Permission.CONTENT_WRITE, label: 'Edit content', group: 'Content' },
  { key: Permission.CONTENT_PUBLISH, label: 'Publish content', group: 'Content' },
  { key: Permission.USERS_MANAGE, label: 'Manage staff users', group: 'Administration' },
  { key: Permission.ROLES_MANAGE, label: 'Manage roles and permissions', group: 'Administration' },
  { key: Permission.AUDIT_LOGS_READ, label: 'Read audit logs', group: 'Administration' },
  { key: Permission.ANALYTICS_READ, label: 'View analytics', group: 'Administration' },
  { key: Permission.SETTINGS_MANAGE, label: 'Manage system settings', group: 'Administration' },
];

/** Default permission grants per role. SUPER_ADMIN implicitly holds every permission. */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.SUPER_ADMIN]: ALL_PERMISSIONS,
  [RoleName.ADMIN]: ALL_PERMISSIONS.filter(
    (permission) => permission !== Permission.ROLES_MANAGE && permission !== Permission.SETTINGS_MANAGE,
  ),
  [RoleName.MANAGER]: [
    Permission.CUSTOMERS_READ,
    Permission.CUSTOMERS_WRITE,
    Permission.APPLICATIONS_READ,
    Permission.APPLICATIONS_WRITE,
    Permission.APPLICATIONS_APPROVE,
    Permission.SUBSCRIPTIONS_READ,
    Permission.SUBSCRIPTIONS_WRITE,
    Permission.PLANS_READ,
    Permission.PLANS_WRITE,
    Permission.COVERAGE_READ,
    Permission.COVERAGE_WRITE,
    Permission.INVOICES_READ,
    Permission.PAYMENTS_READ,
    Permission.TICKETS_READ,
    Permission.TICKETS_ASSIGN,
    Permission.TICKETS_RESOLVE,
    Permission.CALLBACKS_READ,
    Permission.CALLBACKS_WRITE,
    Permission.CONTENT_READ,
    Permission.CONTENT_WRITE,
    Permission.ANALYTICS_READ,
  ],
  [RoleName.SALES_AGENT]: [
    Permission.CUSTOMERS_READ,
    Permission.APPLICATIONS_READ,
    Permission.APPLICATIONS_WRITE,
    Permission.PLANS_READ,
    Permission.COVERAGE_READ,
    Permission.CALLBACKS_READ,
    Permission.CALLBACKS_WRITE,
  ],
  [RoleName.SUPPORT_AGENT]: [
    Permission.CUSTOMERS_READ,
    Permission.SUBSCRIPTIONS_READ,
    Permission.TICKETS_READ,
    Permission.TICKETS_ASSIGN,
    Permission.TICKETS_RESOLVE,
    Permission.CALLBACKS_READ,
    Permission.CALLBACKS_WRITE,
    Permission.CONTENT_READ,
    Permission.PLANS_READ,
    Permission.COVERAGE_READ,
  ],
  [RoleName.FINANCE_AGENT]: [
    Permission.CUSTOMERS_READ,
    Permission.SUBSCRIPTIONS_READ,
    Permission.INVOICES_READ,
    Permission.INVOICES_WRITE,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_REFUND,
    Permission.ANALYTICS_READ,
  ],
  [RoleName.CUSTOMER]: [],
};

export const STAFF_ROLES: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.ADMIN,
  RoleName.MANAGER,
  RoleName.SALES_AGENT,
  RoleName.SUPPORT_AGENT,
  RoleName.FINANCE_AGENT,
];

export function isStaffRole(role: RoleName): boolean {
  return STAFF_ROLES.includes(role);
}
