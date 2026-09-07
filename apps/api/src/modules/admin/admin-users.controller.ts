import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  STAFF_ROLES,
  type AdminUserDto,
  type Paginated,
  type PermissionDto,
  type RoleDto,
} from '@stormfiber/types';
import {
  adminStaffListQuerySchema,
  createStaffUserSchema,
  idParamSchema,
  updateRolePermissionsSchema,
  updateStaffUserSchema,
} from '@stormfiber/validation';
import {
  Ctx,
  CurrentUser,
  RequirePermissions,
  Roles,
  type RequestContext,
} from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody, ApiZodQuery } from '../../common/swagger/zod-swagger';
import {
  AdminUsersService,
  type AdminStaffListQuery,
  type CreateStaffPayload,
  type UpdateRolePermissionsPayload,
  type UpdateStaffPayload,
} from './admin-users.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get('users')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiOperation({ summary: 'Staff directory' })
  @ApiZodQuery(adminStaffListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminStaffListQuerySchema)) query: AdminStaffListQuery,
  ): Promise<Paginated<AdminUserDto>> {
    return this.users.listStaff(query);
  }

  @Post('users')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ResponseMessage('Staff account created')
  @ApiZodBody(createStaffUserSchema)
  create(
    @Body(new ZodValidationPipe(createStaffUserSchema)) body: CreateStaffPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<AdminUserDto> {
    return this.users.createStaff(body, actorId, context);
  }

  @Patch('users/:id')
  @RequirePermissions(Permission.USERS_MANAGE)
  @ApiZodBody(updateStaffUserSchema)
  update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateStaffUserSchema)) body: UpdateStaffPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<AdminUserDto> {
    return this.users.updateStaff(params.id, body, actorId, context);
  }

  @Get('roles')
  @RequirePermissions(Permission.ROLES_MANAGE)
  listRoles(): Promise<RoleDto[]> {
    return this.users.listRoles();
  }

  @Get('permissions')
  @RequirePermissions(Permission.ROLES_MANAGE)
  listPermissions(): Promise<PermissionDto[]> {
    return this.users.listPermissions();
  }

  @Patch('roles/:id')
  @RequirePermissions(Permission.ROLES_MANAGE)
  @ResponseMessage('Role permissions updated')
  @ApiZodBody(updateRolePermissionsSchema)
  updateRole(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateRolePermissionsSchema)) body: UpdateRolePermissionsPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<RoleDto> {
    return this.users.updateRolePermissions(params.id, body, actorId, context);
  }
}
