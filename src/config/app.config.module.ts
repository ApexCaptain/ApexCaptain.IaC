import path from 'path';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { unflatten } from 'flat';
import { AppConfigSchema, AppConfigType } from './app.config.schema';
import { AppConfigService } from './app.config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(process.cwd(), 'env/app.env'),
      load: [
        registerAs('appConfig', () => {
          const validationResult = AppConfigSchema.validate<AppConfigType>(
            unflatten(process.env, {
              delimiter: '_',
            }),
            {
              stripUnknown: true,
            },
          );
          if (validationResult.error) throw validationResult.error;
          return validationResult.value;
        }),
      ],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
