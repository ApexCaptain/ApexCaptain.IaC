import { IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TerraformConfigServiceConfig } from '../../terraform/terraform.config.service';

export class GlobalConfigSchema2 {
  @IsObject()
  @ValidateNested()
  @Type(() => TerraformConfigServiceConfig)
  terraformConfigServiceConfig!: TerraformConfigServiceConfig;
}
export const GlobalConfigSchema2Name = 'globalConfig2';
