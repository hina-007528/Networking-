import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FaqCategoryDto, FaqDto, Paginated } from '@stormfiber/types';
import {
  faqSearchSchema,
  idParamSchema,
  slugParamSchema,
} from '@stormfiber/validation';
import { Public } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodQuery } from '../../common/swagger/zod-swagger';
import { FaqsService, type FaqSearchPayload } from './faqs.service';

@ApiTags('FAQs')
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqs: FaqsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search published FAQs' })
  @ApiZodQuery(faqSearchSchema)
  search(
    @Query(new ZodValidationPipe(faqSearchSchema)) query: FaqSearchPayload,
  ): Promise<Paginated<FaqDto>> {
    return this.faqs.search(query);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'FAQ categories with published article counts' })
  categories(): Promise<FaqCategoryDto[]> {
    return this.faqs.listCategories();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'A single FAQ and related articles in the same category' })
  getBySlug(
    @Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string },
  ): Promise<FaqDto & { related: FaqDto[] }> {
    return this.faqs.getBySlug(params.slug);
  }

  @Post(':id/helpful')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @ResponseMessage('Thanks for the feedback')
  @ApiOperation({ summary: 'Mark an FAQ as helpful' })
  markHelpful(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<{ helpfulCount: number }> {
    return this.faqs.markHelpful(params.id);
  }
}
