import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CustomerDto } from '@stormfiber/types';
import { autoPaySchema, updateOwnProfileSchema } from '@stormfiber/validation';
import { Ctx, CurrentCustomerId, type RequestContext } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger/zod-swagger';
import { CustomersService, type UpdateOwnProfilePayload } from './customers.service';

/**
 * The signed-in customer's own record.
 *
 * The customer id always comes from the access token through `CurrentCustomerId`, never from the
 * request, so one customer cannot read or edit another's account by changing an id.
 */
@ApiTags('Customer')
@ApiBearerAuth()
@Controller('customer')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'The signed-in customer’s profile' })
  profile(@CurrentCustomerId() customerId: string): Promise<CustomerDto> {
    return this.customers.findById(customerId);
  }

  @Patch('profile')
  @ResponseMessage('Profile updated')
  @ApiOperation({ summary: 'Update contact details' })
  @ApiZodBody(updateOwnProfileSchema)
  updateProfile(
    @CurrentCustomerId() customerId: string,
    @Body(new ZodValidationPipe(updateOwnProfileSchema)) body: UpdateOwnProfilePayload,
    @Ctx() context: RequestContext,
  ): Promise<CustomerDto> {
    return this.customers.updateOwnProfile(customerId, body, context);
  }

  @Patch('auto-pay')
  @ResponseMessage('Auto-pay preference saved')
  @ApiOperation({ summary: 'Enable or disable automatic payment of monthly invoices' })
  @ApiZodBody(autoPaySchema)
  setAutoPay(
    @CurrentCustomerId() customerId: string,
    @Body(new ZodValidationPipe(autoPaySchema)) body: { enabled: boolean },
  ): Promise<CustomerDto> {
    return this.customers.setAutoPay(customerId, body.enabled);
  }
}
