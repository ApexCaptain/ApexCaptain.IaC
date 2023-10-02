import { Module } from '@nestjs/common';
import { CdktfAppService } from './cdktf.app.service';
import { CdktfCredentialService } from './cdktf.credential.service';
import * as stacks from './stacks';
const stacksValues = Object.values(stacks);
@Module({
  providers: [CdktfAppService, CdktfCredentialService, ...stacksValues],
  exports: [CdktfAppService],
})
export class AppCdktfModule {}
