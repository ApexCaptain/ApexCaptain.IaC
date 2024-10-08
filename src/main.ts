import { NestFactory } from '@nestjs/core';
import { GlobalConfigService } from './global/config/global.config.schema.service';
import { MainModule } from './main.module';

void (async () => {
  const main = await NestFactory.createApplicationContext(MainModule);

  const configService = main.get(GlobalConfigService);

  console.log(configService.config);
})();
