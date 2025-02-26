import Joi from '@hapi/joi';
import { WorkstationSchema } from './workstation/.schema';
import { OkeSchema } from './oke/.schema';
export const K8SSchema = Joi.object({
  workstation: WorkstationSchema,
  oke: OkeSchema,
}).required();
