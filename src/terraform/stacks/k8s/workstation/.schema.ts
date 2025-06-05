import Joi from '@hapi/joi';

export const WorkstationSchema = Joi.object({
  common: Joi.object({
    domain: Joi.object({
      iptime: Joi.string().required(),
    }).required(),
  }).required(),
  apps: Joi.object({
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
                  isSsd: Joi.boolean().required(),
                }),
              )
              .required(),
          }).required(),
        )
        .required(),
    }).required(),
  }).required(),
}).required();
