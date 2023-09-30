import { Module } from '@nestjs/common';
import { ProjenAuxStack } from './projen-aux.stack';

@Module({
  providers: [ProjenAuxStack],
  exports: [ProjenAuxStack],
})
export class ApexCaptainModule {}
