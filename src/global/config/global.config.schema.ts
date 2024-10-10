import Joi from '@hapi/joi';
import 'joi-extract-type';
import { TerraformConfigService } from '../../terraform/terraform.config.service';

export const GlobalConfigSchema = Joi.object({
  terraform: Joi.object({
    config: TerraformConfigService.SCHEMA,
  }).required(),
}).required();
export const GlobalConfigName = 'globalConfig';
export type GlobalConfigType = Joi.extractType<typeof GlobalConfigSchema>;
