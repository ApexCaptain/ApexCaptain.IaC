import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigType } from './app.config.schema';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get config() {
    return this.configService.get('appConfig') as AppConfigType;
  }
}
