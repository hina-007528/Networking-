import { Module } from '@nestjs/common';
import { FaqsController } from './faqs.controller';
import { FaqsService } from './faqs.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [FaqsController, TicketsController],
  providers: [FaqsService, TicketsService],
  exports: [FaqsService, TicketsService],
})
export class SupportModule {}
