import { Global, Module } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { unflatten } from 'flat';
import {
  GlobalConfigName,
  GlobalConfigSchema,
  GlobalConfigType,
} from './config/global.config.schema';
import { GlobalConfigService } from './config/global.config.schema.service';
import { NodeEnv } from '@/common';
const globalServices = [GlobalConfigService];

@Global()
@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: NodeEnv.getEnvFilePath(),
      load: [
        registerAs(GlobalConfigName, () => {
          const validationResult =
            GlobalConfigSchema.validate<GlobalConfigType>(
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

  providers: globalServices,
  exports: globalServices,
})
export class GlobalModule {}
