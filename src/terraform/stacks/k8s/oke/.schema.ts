import Joi from '@hapi/joi';

export const OkeSchema = Joi.object({
  bastion: Joi.object({
    clientCidrBlockAllowList: Joi.array().items(Joi.string()).required(),
  }).required(),
}).required();
