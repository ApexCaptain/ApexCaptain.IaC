import Joi from '@hapi/joi';
import 'joi-extract-type';

export const AppConfigSchema = Joi.object({}).required();

export type AppConfigType = Joi.extractType<typeof AppConfigSchema>;
