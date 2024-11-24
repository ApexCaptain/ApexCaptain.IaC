import { NestFactory } from '@nestjs/core';
import { MainModule } from './main.module';
import { TerraformAppService } from './terraform/terraform.app.service';
void (async () => {
  const main = await NestFactory.createApplicationContext(MainModule);
  const terraformApp = main.get(TerraformAppService);
  await terraformApp.synth();
})();
