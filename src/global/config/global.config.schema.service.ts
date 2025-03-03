import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalConfigName, GlobalConfigType } from './global.config.schema';
import { GlobalConfigSchema2 } from './global.config.schema2';
import { GlobalConfigSchema2Name } from './global.config.schema2';

@Injectable()
export class GlobalConfigService {
  constructor(private readonly configService: ConfigService) {}

  get config() {
    return this.configService.get(GlobalConfigName) as GlobalConfigType;
  }

  get config2() {
    return this.configService.get(
      GlobalConfigSchema2Name,
    ) as GlobalConfigSchema2;
  }
}
