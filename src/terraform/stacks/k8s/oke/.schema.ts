import Joi from '@hapi/joi';

export const OkeSchema = Joi.object({
  apps: Joi.object({
    nfs: Joi.object({
      sftp: Joi.object({
        userName: Joi.string().required(),
      }).required(),
    }).required(),
    oauth2Proxy: Joi.object({
      admin: Joi.object({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
      }).required(),
      contributor: Joi.object({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
      }).required(),
    }).required(),
    keyCloackVaultProxy: Joi.object({
      clientId: Joi.string().required(),
      clientSecret: Joi.string().required(),
    }),
    homeL2tpVpnProxy: Joi.object({
      vpnServerAddr: Joi.string().required(),
      vpnIpsToRoute: Joi.array().items(Joi.string()).required(),
      vpnGatewayIp: Joi.string().required(),
      vpnAccounts: Joi.array()
        .items(
          Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required(),
          }),
        )
        .required(),
    }).required(),
  }).required(),
}).required();
