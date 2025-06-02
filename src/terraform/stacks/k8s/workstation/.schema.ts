import Joi from '@hapi/joi';

export const WorkstationSchema = Joi.object({
  common: Joi.object({
    domain: Joi.object({
      iptime: Joi.string().required(),
    }).required(),
    volumeDirPath: Joi.object({
      ssdVolume: Joi.string().required(),
      hddVolume: Joi.string().required(),
    }).required(),
  }).required(),
}).required();
