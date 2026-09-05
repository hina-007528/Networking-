import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ProductDto } from '@stormfiber/types';
import { slugParamSchema } from '@stormfiber/validation';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { type ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'The internet, TV and voice product lines' })
  list(): Promise<ProductDto[]> {
    return this.products.list();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'One product line with its feature list' })
  getBySlug(
    @Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string },
  ): Promise<ProductDto> {
    return this.products.getBySlug(params.slug);
  }
}
