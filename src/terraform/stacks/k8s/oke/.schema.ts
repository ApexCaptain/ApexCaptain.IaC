import Joi from '@hapi/joi';

export const OkeSchema = Joi.object({
  apps: Joi.object({
    oauth2Proxy: Joi.object({
      clientId: Joi.string().required(),
      clientSecret: Joi.string().required(),
      allowedGithubUsers: Joi.array().items(Joi.string()).required(),
    }).required(),
  }).required(),
  bastion: Joi.object({
    clientCidrBlockAllowList: Joi.array().items(Joi.string()).required(),
  }).required(),
}).required();
