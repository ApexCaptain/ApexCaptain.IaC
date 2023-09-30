import { Global, Module } from '@nestjs/common';
import { AppCdktfService } from './app.cdktf.service';
import { StacksModule } from './stacks/stacks.module';

@Global()
@Module({
  imports: [StacksModule],
  providers: [AppCdktfService],
  exports: [AppCdktfService],
})
export class AppCdktfModule {}
