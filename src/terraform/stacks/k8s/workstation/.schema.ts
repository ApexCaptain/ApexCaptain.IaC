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
  honeygain: Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
    deviceName: Joi.string().required(),
  }).required(),
  sftp: Joi.object({
    userName: Joi.string().required(),
  }).required(),
  palworld: Joi.object({
    adminPassword: Joi.string().required(),
    serverPassword: Joi.string().required(),
  }).required(),
}).required();
