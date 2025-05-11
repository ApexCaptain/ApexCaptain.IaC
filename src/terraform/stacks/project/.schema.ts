import Joi from '@hapi/joi';

export const ProjectSchema = Joi.object({
  externalGithubCollaborators: Joi.object({
    gjwoo960101: Joi.object({
      username: Joi.string().required(),
    }).required(),
  }).required(),
}).required();
