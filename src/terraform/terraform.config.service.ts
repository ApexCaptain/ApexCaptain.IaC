import path from 'path';
import { Injectable } from '@nestjs/common';
import {
  CloudBackendConfig,
  LocalBackend,
  LocalBackendConfig,
  NamedCloudWorkspace,
  TaggedCloudWorkspaces,
} from 'cdktf';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { GithubProviderConfig } from '@lib/terraform/providers/github/provider';
import { KubernetesProviderConfig } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class TerraformConfigService {
  private readonly config = this.globalConfigService.config.terraform.config;

  readonly backends = (() => {
    // LocalBackend
    const localBakcned = {
      secrets: (option: { stateId: string }): LocalBackendConfig => {
        return {
          path: path.join(
            this.config.backends.localBackend.secrets.dirPath,
            `${option.stateId}.tfstate`,
          ),
        };
      },
    };

    return {
      localBakcned,
    };
  })();
  readonly providers = (() => {
    const github = {
      ApexCaptain: (
        config?: Partial<Omit<GithubProviderConfig, 'owner' | 'token'>>,
      ): GithubProviderConfig => {
        return {
          owner: this.config.providers.github.ApexCaptain.owner,
          token: this.config.providers.github.ApexCaptain.token,
          ...config,
        };
      },
    };

    const kubernetes = {
      ApexCaptain: {
        workstation: (
          config?: Partial<
            Omit<KubernetesProviderConfig, 'configPath' | 'insecure'>
          >,
        ): KubernetesProviderConfig => {
          return {
            configPath:
              this.config.providers.kubernetes.ApexCaptain.workstation
                .configPath,
            insecure: true,
            ...config,
          };
        },
      },
    };

    return {
      /**
       * @See https://github.com/
       */
      github,

      kubernetes,
    };
  })();

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,
  ) {}
}
