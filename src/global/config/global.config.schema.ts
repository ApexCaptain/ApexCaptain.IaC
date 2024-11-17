import Joi from '@hapi/joi';
import 'joi-extract-type';
import { TerraformConfigSchema } from '../../terraform/terraform.config.schema';

export const GlobalConfigSchema = Joi.object({
  terraform: Joi.object({
    stacks: Joi.object({
      k8s: Joi.object({
        workstation: Joi.object({
          meta: Joi.object({
            workstationDomain: Joi.string().required(),
            workstationMountDirPath: Joi.object({
              ssdVolume: Joi.string().required(),
              hddVolume: Joi.string().required(),
            }).required(),
          }).required(),
        }).required(),
      }).required(),
    }).required(),
    config: TerraformConfigSchema,
  }).required(),
}).required();
export const GlobalConfigName = 'globalConfig';
export type GlobalConfigType = Joi.extractType<typeof GlobalConfigSchema>;
