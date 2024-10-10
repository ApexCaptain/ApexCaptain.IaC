import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';
import { TerraformModule } from './terraform/terraform.module';

@Module({
  imports: [GlobalModule, TerraformModule],
})
export class MainModule {}
