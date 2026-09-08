import { Module } from '@nestjs/common';
import { GeographyModule } from '../geography/geography.module';
import { CoverageController } from './coverage.controller';
import { CoverageService } from './coverage.service';

@Module({
  imports: [GeographyModule],
  controllers: [CoverageController],
  providers: [CoverageService],
  exports: [CoverageService],
})
export class CoverageModule {}
