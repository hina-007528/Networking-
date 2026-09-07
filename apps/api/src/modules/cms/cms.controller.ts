import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CmsPageDto, HeroSlideDto, HomepageDto, SiteSettingsDto } from '@stormfiber/types';
import { slugParamSchema } from '@stormfiber/validation';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CmsService } from './cms.service';

/**
 * Public content. Admin mutations live in the admin CMS module and call `CmsService.invalidate`.
 */
@ApiTags('CMS')
@Controller('cms')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Get('home')
  @Public()
  @ApiOperation({ summary: 'Homepage slides, sections and site settings' })
  home(): Promise<HomepageDto> {
    return this.cms.homepage();
  }

  @Get('hero-slides')
  @Public()
  @ApiOperation({ summary: 'Published hero slides' })
  slides(): Promise<HeroSlideDto[]> {
    return this.cms.heroSlides();
  }

  @Get('settings')
  @Public()
  @ApiOperation({ summary: 'Brand chrome: footer, announcement, support contacts' })
  settings(): Promise<SiteSettingsDto> {
    return this.cms.settings();
  }

  @Get('pages/:slug')
  @Public()
  @ApiOperation({ summary: 'A published CMS page by slug' })
  page(
    @Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string },
  ): Promise<CmsPageDto> {
    return this.cms.page(params.slug);
  }
}
