import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';

@Module({
  imports: [GlobalModule],
})
export class MainModule {}
