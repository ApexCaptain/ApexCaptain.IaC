import Joi from '@hapi/joi';

export const OkeSchema = Joi.object({
  bastion: Joi.object({
    clientCidrBlockAllowList: Joi.array().items(Joi.string()).required(),
    dynamicEnvironmentKeys: Joi.object({
      kubeConfigFilePath: Joi.string().required(),
      socks5ProxyUrl: Joi.string().required(),
      simpleProxyUrl: Joi.string().required(),
    }).required(),
  }).required(),
}).required();
