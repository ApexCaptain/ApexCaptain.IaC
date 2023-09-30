import { Module } from '@nestjs/common';
import { AppCdktfModule } from './cdktf/app.cdktf.module';
import { AppConfigModule } from '@config/app.config.module';

@Module({
  imports: [AppConfigModule, AppCdktfModule],
})
export class AppModule {}
