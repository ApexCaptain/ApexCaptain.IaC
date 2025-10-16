import Joi from '@hapi/joi';
import { OkeSchema } from './oke/.schema';
import { WorkstationSchema } from './workstation/.schema';
export const K8SSchema = Joi.object({
  workstation: WorkstationSchema,
  oke: OkeSchema,
}).required();
