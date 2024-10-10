import { Module } from '@nestjs/common';
import * as stacks from './stacks';
import { TerraformAppService } from './terraform.app.service';
import { TerraformConfigService } from './terraform.config.service';

@Module({
  providers: [
    TerraformAppService,
    TerraformConfigService,
    ...Object.values(stacks),
  ],
  exports: [TerraformAppService],
})
export class TerraformModule {}
