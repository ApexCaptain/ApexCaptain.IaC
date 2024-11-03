import Joi from '@hapi/joi';

export const TerraformConfigSchema = Joi.object({
  backends: Joi.object({
    cloudBackend: Joi.object({
      ApexCaptain: Joi.object({
        organization: Joi.string().required(),
        token: Joi.string().required(),
        projects: Joi.object({
          iacProject: Joi.string().required(),
        }).required(),
      }).required(),
    }).required(),
  }).required(),
  providers: Joi.object({
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
  }).required(),
}).required();
