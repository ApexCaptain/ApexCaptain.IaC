import { NestFactory } from '@nestjs/core';
import moment from 'moment';
import Timezone from 'timezone-enum';
import { MainModule } from './main.module';
import { TerraformAppService } from './terraform/terraform.app.service';
import 'moment-timezone';

moment.tz.setDefault(Timezone['Asia/Seoul']);

void (async () => {
  const main = await NestFactory.createApplicationContext(MainModule);
  const terraformApp = main.get(TerraformAppService);
  await terraformApp.synth();
})();
