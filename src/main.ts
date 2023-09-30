import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

void (async () => {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log(app);
})();
