import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalConfigName, GlobalConfigType } from './global.config.schema';

@Injectable()
export class GlobalConfigService {
  constructor(private readonly configService: ConfigService) {}

  get config() {
    return this.configService.get(GlobalConfigName) as GlobalConfigType;
  }
}
