import Joi from '@hapi/joi';
import 'joi-extract-type';
import { K8S_Workstation_Meta_Schema } from '../../terraform/stacks/k8s/workstation/meta.schema';
import { TerraformConfigSchema } from '../../terraform/terraform.config.schema';

export const GlobalConfigSchema = Joi.object({
  terraform: Joi.object({
    stacks: Joi.object({
      k8s: Joi.object({
        workstation: Joi.object({
          meta: K8S_Workstation_Meta_Schema,
        }).required(),
      }).required(),
    }).required(),
    config: TerraformConfigSchema,
  }).required(),
}).required();
export const GlobalConfigName = 'globalConfig';
export type GlobalConfigType = Joi.extractType<typeof GlobalConfigSchema>;
