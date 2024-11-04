import Joi from '@hapi/joi';

export const K8S_Workstation_Meta_Schema = Joi.object({
  workstationMountDirPath: Joi.object({
    ssdVolume: Joi.string().required(),
    hddVolume: Joi.string().required(),
  }).required(),
}).required();
