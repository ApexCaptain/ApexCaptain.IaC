import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppCdktfService } from './cdktf/app.cdktf.service';

void (async () => {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cdktfApp = app.get(AppCdktfService);
  await cdktfApp.synth();
})();
