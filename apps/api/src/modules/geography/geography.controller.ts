import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AreaDto, CityDto, SubAreaDto } from '@stormfiber/types';
import { idParamSchema, slugParamSchema } from '@stormfiber/validation';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GeographyService } from './geography.service';

/**
 * Public geography endpoints backing the city selector and the cascading area pickers.
 *
 * These are the only endpoints the coverage checker needs before a lookup, so they are cached and
 * deliberately cheap.
 */
@ApiTags('Geography')
@Controller()
export class GeographyController {
  constructor(private readonly geography: GeographyService) {}

  @Get('cities')
  @Public()
  @ApiOperation({ summary: 'Cities where StormFiber operates or is expanding' })
  listCities(): Promise<CityDto[]> {
    return this.geography.listCities();
  }

  @Get('cities/:slug')
  @Public()
  @ApiOperation({ summary: 'A single city, including its helpline and branch address' })
  getCity(@Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string }): Promise<CityDto> {
    return this.geography.getCityBySlug(params.slug);
  }

  @Get('cities/:slug/areas')
  @Public()
  @ApiOperation({ summary: 'Areas within a city, with their coverage status' })
  listAreas(
    @Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string },
  ): Promise<AreaDto[]> {
    return this.geography.listAreasByCitySlug(params.slug);
  }

  @Get('areas/:id/subareas')
  @Public()
  @ApiOperation({ summary: 'Sub-areas (blocks, phases, sectors) within an area' })
  listSubAreas(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<SubAreaDto[]> {
    return this.geography.listSubAreas(params.id);
  }
}
