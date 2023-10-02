import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CdktfAppService } from './cdktf/cdktf.app.service';

void (async () => {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cdktfApp = app.get(CdktfAppService);
  await cdktfApp.synth();
})();
