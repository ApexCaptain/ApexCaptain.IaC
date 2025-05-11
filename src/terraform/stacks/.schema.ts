import Joi from '@hapi/joi';
import { K8SSchema } from './k8s/.schema';
import { CloudflareSchema } from './cloudflare/.schema';
import { ProjectSchema } from './project/.schema';
export const StacksSchema = Joi.object({
  common: Joi.object({
    generatedDockerConfigFileDirPath: Joi.string().required(),
    generatedKeyFilesDirPaths: Joi.object({
      relativeSecretsDirPath: Joi.string().required(),
      relativeKeysDirPath: Joi.string().required(),
    }).required(),
    kubeConfigDirRelativePath: Joi.string().required(),
  }).required(),
  cloudflare: CloudflareSchema,
  k8s: K8SSchema,
  project: ProjectSchema,
}).required();
