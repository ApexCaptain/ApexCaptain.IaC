import { Module } from '@nestjs/common';
import { AppCdktfModule } from './cdktf/cdktf.module';
import { AppConfigModule } from '@config/app.config.module';

@Module({
  imports: [AppConfigModule, AppCdktfModule],
})
export class AppModule {}
