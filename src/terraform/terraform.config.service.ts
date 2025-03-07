import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackendConfig } from 'cdktf';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { CloudflareProviderConfig } from '@lib/terraform/providers/cloudflare/provider';
import { GithubProviderConfig } from '@lib/terraform/providers/github/provider';
import { HelmProviderConfig } from '@lib/terraform/providers/helm/provider';
import { KubernetesProviderConfig } from '@lib/terraform/providers/kubernetes/provider';
import { OciProviderConfig } from '@lib/terraform/providers/oci/provider';
import { GoogleProviderConfig } from '@lib/terraform/providers/google/provider';

@Injectable()
export class TerraformConfigService {
  private readonly config = this.globalConfigService.config.terraform.config;

  readonly backends = (() => {
    // LocalBackend
    const localBackend = {
      secrets: (option: { stackName: string }): LocalBackendConfig => {
        const paths = option.stackName.split('_');
        if (paths.pop() != 'Stack') {
          throw new Error('Invalid stack name');
        }
        const stateFilePath = path.join(
          this.config.backends.localBackend.secrets.dirPath,
          `${paths.join('/')}.tfstate`,
        );
        return {
          path: stateFilePath,
        };
      },
    };

    return {
      localBackend,
    };
  })();
  readonly providers = (() => {
    const cloudflare = {
      ApexCaptain: (): CloudflareProviderConfig => {
        return {
          apiToken: this.config.providers.cloudflare.ApexCaptain.apiToken,
        };
      },
    };

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

    const helm = {
      ApexCaptain: {
        workstation: (): HelmProviderConfig => {
          return {
            kubernetes: {
              configPath:
                this.config.providers.kubernetes.ApexCaptain.workstation
                  .configPath,
              insecure: true,
            },
          };
        },
      },
    };

    const oci = {
      ApexCaptain: (): OciProviderConfig => {
        return {
          auth: 'ApiKey',
          userOcid: this.config.providers.oci.ApexCaptain.userOcid,
          fingerprint: this.config.providers.oci.ApexCaptain.fingerprint,
          tenancyOcid: this.config.providers.oci.ApexCaptain.tenancyOcid,
          region: this.config.providers.oci.ApexCaptain.region,
          privateKey: this.config.providers.oci.ApexCaptain.privateKey.replace(
            /\\\n/g,
            '\n',
          ),
        };
      },
    };

    const google = {
      ApexCaptain: (): GoogleProviderConfig => {
        return {
          credentials: path.join(
            process.cwd(),
            this.config.providers.google.ApexCaptain.credentials,
          ),
          region: this.config.providers.google.ApexCaptain.region,
          zone: this.config.providers.google.ApexCaptain.zone,
        };
      },
    };

    return {
      cloudflare,

      github,

      kubernetes,

      helm,

      oci,

      google,
    };
  })();

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,
  ) {}
}
