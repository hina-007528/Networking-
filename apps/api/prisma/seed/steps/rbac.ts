import { type PrismaClient, RoleName, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from '@stormfiber/types';
import { roleLabels } from '@stormfiber/config';
import { logStep, requireEnv } from '../utils';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

export interface SeededStaff {
  superAdminId: string;
  adminId: string;
  managerId: string;
  supportAgentId: string;
  financeAgentId: string;
  salesAgentId: string;
}

async function upsertUser(
  prisma: PrismaClient,
  input: {
    email: string;
    password: string;
    mobile: string;
    firstName: string;
    lastName: string;
    roles: RoleName[];
  },
): Promise<string> {
  const passwordHash = await bcrypt.hash(input.password, ROUNDS);
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      mobile: input.mobile,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
      mobileVerifiedAt: now,
    },
    create: {
      email: input.email,
      mobile: input.mobile,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
      mobileVerifiedAt: now,
    },
  });

  const roles = await prisma.role.findMany({ where: { name: { in: input.roles } } });
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.createMany({
    data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
    skipDuplicates: true,
  });

  return user.id;
}

export async function seedRbac(prisma: PrismaClient): Promise<SeededStaff> {
  logStep('permissions');
  for (const definition of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: definition.key },
      update: { label: definition.label, group: definition.group },
      create: { key: definition.key, label: definition.label, group: definition.group },
    });
  }

  logStep('roles and role permissions');
  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { label: roleLabels[roleName] },
      create: { name: roleName, label: roleLabels[roleName], isSystem: true },
    });

    const grantedKeys = ROLE_PERMISSIONS[roleName];
    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...grantedKeys] } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  logStep('staff users');
  const superAdminId = await upsertUser(prisma, {
    email: requireEnv('SEED_SUPER_ADMIN_EMAIL'),
    password: requireEnv('SEED_SUPER_ADMIN_PASSWORD'),
    mobile: '03001000001',
    firstName: 'Sara',
    lastName: 'Owner',
    roles: [RoleName.SUPER_ADMIN],
  });

  const adminId = await upsertUser(prisma, {
    email: requireEnv('SEED_ADMIN_EMAIL'),
    password: requireEnv('SEED_ADMIN_PASSWORD'),
    mobile: '03001000002',
    firstName: 'Imran',
    lastName: 'Admin',
    roles: [RoleName.ADMIN],
  });

  const managerId = await upsertUser(prisma, {
    email: requireEnv('SEED_MANAGER_EMAIL'),
    password: requireEnv('SEED_MANAGER_PASSWORD'),
    mobile: '03001000003',
    firstName: 'Nadia',
    lastName: 'Manager',
    roles: [RoleName.MANAGER],
  });

  const supportAgentId = await upsertUser(prisma, {
    email: requireEnv('SEED_SUPPORT_EMAIL'),
    password: requireEnv('SEED_SUPPORT_PASSWORD'),
    mobile: '03001000004',
    firstName: 'Hamza',
    lastName: 'Support',
    roles: [RoleName.SUPPORT_AGENT],
  });

  const financeAgentId = await upsertUser(prisma, {
    email: requireEnv('SEED_FINANCE_EMAIL'),
    password: requireEnv('SEED_FINANCE_PASSWORD'),
    mobile: '03001000005',
    firstName: 'Zainab',
    lastName: 'Finance',
    roles: [RoleName.FINANCE_AGENT],
  });

  const salesAgentId = await upsertUser(prisma, {
    email: requireEnv('SEED_SALES_EMAIL'),
    password: requireEnv('SEED_SALES_PASSWORD'),
    mobile: '03001000006',
    firstName: 'Bilal',
    lastName: 'Sales',
    roles: [RoleName.SALES_AGENT],
  });

  return { superAdminId, adminId, managerId, supportAgentId, financeAgentId, salesAgentId };
}
