import Joi from '@hapi/joi';
import 'joi-extract-type';

export const GlobalConfigSchema = Joi.object({
  somw: Joi.string().required(),
}).required();
export const GlobalConfigName = 'globalConfig';
export type GlobalConfigType = Joi.extractType<typeof GlobalConfigSchema>;
