import Joi from '@hapi/joi';
import 'joi-extract-type';
// import { TerraformConfigService } from '../../terraform/terraform.config.service';
import { TerraformConfigSchema } from '../../terraform/terraform.config.schema';

export const GlobalConfigSchema = Joi.object({
  terraform: Joi.object({
    config: TerraformConfigSchema,
  }).required(),
}).required();
export const GlobalConfigName = 'globalConfig';
export type GlobalConfigType = Joi.extractType<typeof GlobalConfigSchema>;
