import { Inject, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { RoleName, type Prisma } from '@prisma/client';
import type { AdminUserDto, Paginated, PermissionDto, RoleDto } from '@stormfiber/types';
import { ALL_PERMISSIONS, RoleName as Role } from '@stormfiber/types';
import type {
  adminStaffListQuerySchema,
  createStaffUserSchema,
  updateRolePermissionsSchema,
  updateStaffUserSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { throwIfUniqueConflict } from '../../common/utils/prisma-errors';

export type AdminStaffListQuery = z.output<typeof adminStaffListQuerySchema>;
export type CreateStaffPayload = z.output<typeof createStaffUserSchema>;
export type UpdateStaffPayload = z.output<typeof updateStaffUserSchema>;
export type UpdateRolePermissionsPayload = z.output<typeof updateRolePermissionsSchema>;

const staffSelect = {
  id: true,
  email: true,
  mobile: true,
  firstName: true,
  lastName: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof staffSelect }>;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async listStaff(query: AdminStaffListQuery): Promise<Paginated<AdminUserDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      roles: { some: { role: { name: { not: RoleName.CUSTOMER } } } },
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { roles: { some: { role: { name: query.role } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: staffSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toUserDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async createStaff(
    input: CreateStaffPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    if (input.roles.includes(Role.CUSTOMER)) {
      throw AppException.badRequest('Staff accounts cannot be assigned the customer role');
    }
    await this.assertCanAssignSuperAdmin(actorId, input.roles);

    const roles = await this.prisma.role.findMany({
      where: { name: { in: input.roles } },
      select: { id: true },
    });

    if (roles.length !== input.roles.length) {
      throw AppException.badRequest('One or more roles do not exist');
    }

    try {
      const created = await this.prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email.toLowerCase(),
          mobile: input.mobile,
          passwordHash: await hash(input.password, this.config.auth.bcryptRounds),
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          mobileVerifiedAt: new Date(),
          roles: { create: roles.map((role) => ({ roleId: role.id })) },
        },
        select: staffSelect,
      });

      await this.audit.record({
        userId: actorId,
        action: AuditAction.USER_CREATED,
        entity: 'User',
        entityId: created.id,
        newValue: { email: created.email, roles: input.roles },
        context,
      });

      return this.toUserDto(created);
    } catch (error) {
      throwIfUniqueConflict(error, 'An account already uses that email or mobile number');
    }
  }

  async updateStaff(
    id: string,
    input: UpdateStaffPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<AdminUserDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw AppException.notFound('User');
    }

    if (input.roles?.includes(Role.CUSTOMER)) {
      throw AppException.badRequest('Staff accounts cannot be assigned the customer role');
    }
    if (input.roles) {
      await this.assertCanAssignSuperAdmin(actorId, input.roles);
    }

    if (input.status && input.status !== 'ACTIVE') {
      await this.assertNotLastSuperAdmin(id);
    }

    const roleIds = input.roles
      ? await this.prisma.role.findMany({
          where: { name: { in: input.roles } },
          select: { id: true },
        })
      : null;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (roleIds) {
          await tx.userRole.deleteMany({ where: { userId: id } });
          await tx.userRole.createMany({
            data: roleIds.map((role) => ({ userId: id, roleId: role.id })),
          });
        }

        return tx.user.update({
          where: { id },
          data: {
            ...(input.firstName === undefined ? {} : { firstName: input.firstName }),
            ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
            ...(input.mobile === undefined ? {} : { mobile: input.mobile }),
            ...(input.status === undefined ? {} : { status: input.status }),
          },
          select: staffSelect,
        });
      });

      await this.audit.record({
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        entity: 'User',
        entityId: id,
        newValue: input,
        context,
      });

      return this.toUserDto(updated);
    } catch (error) {
      throwIfUniqueConflict(error, 'An account already uses that mobile number');
    }
  }

  async listRoles(): Promise<RoleDto[]> {
    const rows = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      label: row.label,
      description: row.description,
      isSystem: row.isSystem,
      permissions:
        row.name === RoleName.SUPER_ADMIN
          ? [...ALL_PERMISSIONS]
          : row.permissions.map((grant) => grant.permission.key),
      userCount: row._count.users,
    }));
  }

  async listPermissions(): Promise<PermissionDto[]> {
    const rows = await this.prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      label: row.label,
      group: row.group,
    }));
  }

  async updateRolePermissions(
    roleId: string,
    input: UpdateRolePermissionsPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true },
    });

    if (!role) {
      throw AppException.notFound('Role');
    }

    if (role.name === RoleName.SUPER_ADMIN) {
      throw AppException.forbidden('Super admin always holds every permission');
    }

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: input.permissions } },
      select: { id: true, key: true },
    });

    const unknown = input.permissions.filter(
      (key) => !permissions.some((permission) => permission.key === key),
    );
    if (unknown.length > 0) {
      throw AppException.badRequest(`Unknown permissions: ${unknown.join(', ')}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
        });
      }
    });

    await this.audit.record({
      userId: actorId,
      action: AuditAction.ROLE_PERMISSIONS_CHANGED,
      entity: 'Role',
      entityId: roleId,
      newValue: { permissions: input.permissions },
      context,
    });

    const [updated] = await this.listRoles();
    return (await this.listRoles()).find((item) => item.id === roleId) ?? updated;
  }

  private async assertCanAssignSuperAdmin(actorId: string, roles: Role[]): Promise<void> {
    if (!roles.includes(Role.SUPER_ADMIN)) {
      return;
    }

    const actorIsSuperAdmin = await this.prisma.userRole.count({
      where: { userId: actorId, role: { name: RoleName.SUPER_ADMIN } },
    });

    if (actorIsSuperAdmin === 0) {
      throw AppException.forbidden('Only a super admin can assign the super admin role');
    }
  }

  private async assertNotLastSuperAdmin(userId: string): Promise<void> {
    const superAdmins = await this.prisma.userRole.count({
      where: {
        role: { name: RoleName.SUPER_ADMIN },
        user: { status: 'ACTIVE', deletedAt: null },
      },
    });

    const isSuperAdmin = await this.prisma.userRole.count({
      where: { userId, role: { name: RoleName.SUPER_ADMIN } },
    });

    if (isSuperAdmin > 0 && superAdmins <= 1) {
      throw AppException.conflict('The last active super admin cannot be disabled');
    }
  }

  private toUserDto(row: StaffRow): AdminUserDto {
    return {
      id: row.id,
      email: row.email,
      mobile: row.mobile,
      firstName: row.firstName,
      lastName: row.lastName,
      fullName: `${row.firstName} ${row.lastName}`,
      status: row.status,
      roles: row.roles.map((entry) => entry.role.name),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
