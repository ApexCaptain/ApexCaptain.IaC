import { Injectable } from '@nestjs/common';
import { CloudBackendConfig } from 'cdktf';
import { AppConfigService } from '@config/app.config.service';
import { GithubProviderConfig } from '@terraform/providers/github/provider';
import { LocalProviderConfig } from '@terraform/providers/local/provider';

interface ProvidersConfigCredentials {
  providersConfig: {
    local: {
      [key: string]: LocalProviderConfig;
    };
    github: {
      [key: string]: GithubProviderConfig;
    };
  };
}
interface BackendConfigCredentials {
  backendConfig: {
    cloudBackend: {
      [key: string]: Omit<CloudBackendConfig, 'workspaces'>;
    };
  };
}

@Injectable()
export class CdktfCredentialService
  implements ProvidersConfigCredentials, BackendConfigCredentials
{
  backendConfig = {
    cloudBackend: {
      /**
       * @see https://app.terraform.io/app/ApexCaptain/workspaces
       */
      ApexCaptain: {
        organization:
          this.appConfigService.config.backendCredentials.cloudBackend
            .ApexCaptain.organization,
        token:
          this.appConfigService.config.backendCredentials.cloudBackend
            .ApexCaptain.token,
      },
    },
  };

  providersConfig = {
    local: {
      default: {},
    },
    github: {
      /**
       * @see https://github.com/ApexCaptain
       */
      ApexCaptain: {
        owner:
          this.appConfigService.config.providerCredentials.github.ApexCaptain
            .owner,
        token:
          this.appConfigService.config.providerCredentials.github.ApexCaptain
            .token,
      },
    },
  };

  constructor(
    // Global
    private readonly appConfigService: AppConfigService,
  ) {}
}
