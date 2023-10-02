import Joi from '@hapi/joi';
import 'joi-extract-type';

const gitubProviderCredentialSchema = Joi.object({
  owner: Joi.string().required(),
  token: Joi.string().required(),
}).required();

const terraformCloudBackendCredentialSchema = Joi.object({
  organization: Joi.string().required(),
  token: Joi.string(),
}).required();

export const AppConfigSchema = Joi.object({
  backendCredentials: Joi.object({
    cloudBackend: Joi.object({
      ApexCaptain: terraformCloudBackendCredentialSchema,
    }).required(),
  }).required(),
  providerCredentials: Joi.object({
    github: Joi.object({
      ApexCaptain: gitubProviderCredentialSchema,
    }).required(),
  }).required(),
}).required();

export type AppConfigType = Joi.extractType<typeof AppConfigSchema>;
