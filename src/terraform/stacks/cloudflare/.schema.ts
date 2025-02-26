import Joi from '@hapi/joi';

export const CloudflareSchema = Joi.object({
  zone: Joi.object({
    ayteneve93com: Joi.object({
      zoneId: Joi.string().required(),
    }).required(),
  }).required(),
}).required();
