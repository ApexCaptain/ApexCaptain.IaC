import Joi from '@hapi/joi';

export const OkeSchema = Joi.object({
  apps: Joi.object({
    oauth2Proxy: Joi.object({
      clientId: Joi.string().required(),
      clientSecret: Joi.string().required(),
      allowedGithubUsers: Joi.array().items(Joi.string()).required(),
    }).required(),
    homeL2tpVpnProxy: Joi.object({
      vpnServerAddr: Joi.string().required(),
      vpnUsername: Joi.string().required(),
      vpnPassword: Joi.string().required(),
      vpnIpsToRoute: Joi.string().required(),
      vpnGatewayIp: Joi.string().required(),
    }).required(),
  }).required(),
  bastion: Joi.object({
    clientCidrBlockAllowList: Joi.array().items(Joi.string()).required(),
  }).required(),
  network: Joi.object({
    l2tpServerCidrBlocks: Joi.array().items(Joi.string()).required(),
  }).required(),
}).required();
