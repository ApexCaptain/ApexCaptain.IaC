import Joi from '@hapi/joi';
import { Injectable } from '@nestjs/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';

@Injectable()
export class TerraformConfigService {
  static readonly SCHEMA = Joi.object({
    backends: Joi.object({
      cloudBackend: Joi.object({
        ApexCaptain: Joi.object({
          organization: Joi.string().required(),
          token: Joi.string().required(),
        }).required(),
      }).required(),
    }).required(),
  }).required();

  private readonly config: Joi.extractType<
    typeof TerraformConfigService.SCHEMA
  > = this.globalConfigService.config.terraform.credential;

  readonly backends = (() => {})();
  readonly providers = (() => {})();

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,
  ) {}
}
