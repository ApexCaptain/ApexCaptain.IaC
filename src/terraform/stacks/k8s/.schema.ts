import Joi from '@hapi/joi';
import { WorkstationSchema } from './workstation/.schema';

export const K8SSchema = Joi.object({
  workstation: WorkstationSchema,
}).required();
