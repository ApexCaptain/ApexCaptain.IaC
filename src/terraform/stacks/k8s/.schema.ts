import Joi from '@hapi/joi';
import { OkeSchema } from './oke/.schema';
import { WorkstationSchema } from './workstation/.schema';
export const K8SSchema = Joi.object({
  serviceMesh: Joi.object({
    meshId: Joi.string().required(),
    okeClusterName: Joi.string().required(),
    workstationClusterName: Joi.string().required(),
  }).required(),
  workstation: WorkstationSchema,
  oke: OkeSchema,
}).required();
