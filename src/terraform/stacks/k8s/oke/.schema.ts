import Joi from '@hapi/joi';

export const OkeSchema = Joi.object({
  bastion: Joi.object({
    clientCidrBlockAllowList: Joi.array().items(Joi.string()).required(),
    dynamicEnvironmentKeys: Joi.object({
      kubeConfigFilePath: Joi.string().required(),
      httpsProxyUrl: Joi.string().required(),
    }).required(),
  }).required(),
}).required();
