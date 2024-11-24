import Joi from '@hapi/joi';
import 'joi-extract-type';
import { TerraformSchema } from '../../terraform/.schema';
export const GlobalConfigSchema = Joi.object({
  terraform: TerraformSchema,
}).required();
export const GlobalConfigName = 'globalConfig';
export type GlobalConfigType = Joi.extractType<typeof GlobalConfigSchema>;
