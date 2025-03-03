import Joi from '@hapi/joi';
import { K8SSchema } from './k8s/.schema';
import { CloudflareSchema } from './cloudflare/.schema';

export const StacksSchema = Joi.object({
  common: Joi.object({
    generatedKeyFilesDirPaths: Joi.object({
      relativeSecretsDirPath: Joi.string().required(),
      relativeKeysDirPath: Joi.string().required(),
    }).required(),
    kubeConfigDirRelativePath: Joi.string().required(),
  }).required(),
  cloudflare: CloudflareSchema,
  k8s: K8SSchema,
}).required();
