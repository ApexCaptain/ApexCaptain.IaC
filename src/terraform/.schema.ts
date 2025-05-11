import Joi from '@hapi/joi';
import { StacksSchema } from './stacks/.schema';

export const TerraformSchema = Joi.object({
  externalIpCidrBlocks: Joi.object({
    apexCaptainHome: Joi.string().required(),
    gjwoo960101: Joi.string().required(),
    nayuntechCorp: Joi.string().required(),
  }).required(),
  config: Joi.object({
    backends: Joi.object({
      localBackend: Joi.object({
        secrets: Joi.object({
          dirPath: Joi.string().required(),
        }).required(),
      }).required(),
    }).required(),
    providers: Joi.object({
      cloudflare: Joi.object({
        ApexCaptain: Joi.object({
          apiToken: Joi.string().required(),
          email: Joi.string().email().required(),
        }).required(),
      }).required(),

      github: Joi.object({
        ApexCaptain: Joi.object({
          owner: Joi.string().required(),
          token: Joi.string().required(),
        }).required(),
      }).required(),

      kubernetes: Joi.object({
        ApexCaptain: Joi.object({
          workstation: Joi.object({
            configPath: Joi.string().required(),
          }).required(),
        }).required(),
      }).required(),

      oci: Joi.object({
        ApexCaptain: Joi.object({
          userOcid: Joi.string().required(),
          fingerprint: Joi.string().required(),
          tenancyOcid: Joi.string().required(),
          region: Joi.string().required(),
          privateKey: Joi.string().required(),
        }).required(),
      }).required(),
    }).required(),
    generatedScriptLibDirRelativePath: Joi.string().required(),
  }).required(),

  stacks: StacksSchema,
}).required();
