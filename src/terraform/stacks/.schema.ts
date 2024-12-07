import Joi from '@hapi/joi';
import { K8SSchema } from './k8s/.schema';
export const StacksSchema = Joi.object({
  common: Joi.object({
    generatedKeyFilesDirRelativePaths: Joi.object({
      secrets: Joi.string().required(),
      keys: Joi.string().required(),
    }).required(),
    kubeConfigDirRelativePath: Joi.string().required(),
  }).required(),
  k8s: K8SSchema,
}).required();
