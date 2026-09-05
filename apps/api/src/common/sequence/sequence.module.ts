import { Global, Module } from '@nestjs/common';
import { SequenceService } from './sequence.service';

/** Global: account and invoice numbering must share one counter implementation. */
@Global()
@Module({
  providers: [SequenceService],
  exports: [SequenceService],
})
export class SequenceModule {}
