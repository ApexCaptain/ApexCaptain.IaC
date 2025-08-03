import Joi from '@hapi/joi';

export const WorkstationSchema = Joi.object({
  common: Joi.object({
    defaultCalcioIpv4IpPoolsCidrBlock: Joi.string().required(),
    nordLynxPrivateKey: Joi.string().required(),
    domain: Joi.object({
      iptime: Joi.string().required(),
    }).required(),
  }).required(),
  apps: Joi.object({
    metallb: Joi.object({
      loadbalancerIpRange: Joi.string().required(),
    }).required(),
    longhorn: Joi.object({
      nodes: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            disks: Joi.array()
              .items(
                Joi.object({
                  name: Joi.string().required(),
                  path: Joi.string().required(),
                  diskType: Joi.string().required(),
                  isSsd: Joi.boolean().required(),
                }),
              )
              .required(),
          }).required(),
        )
        .required(),
    }).required(),
    files: Joi.object({
      sftp: Joi.object({
        userName: Joi.string().required(),
      }).required(),
    }).required(),
  }).required(),
}).required();
