import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackendConfig } from 'cdktf';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { CloudflareProviderConfig } from '@lib/terraform/providers/cloudflare/provider';
import { GithubProviderConfig } from '@lib/terraform/providers/github/provider';
import { HelmProviderConfig } from '@lib/terraform/providers/helm/provider';
import { KubernetesProviderConfig } from '@lib/terraform/providers/kubernetes/provider';
import { OciProviderConfig } from '@lib/terraform/providers/oci/provider';
@Injectable()
export class TerraformConfigService {
  private readonly config = this.globalConfigService.config.terraform.config;

  readonly backends = (() => {
    // LocalBackend
    const localBakcned = {
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
      localBakcned,
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
    return {
      cloudflare,

      github,

      kubernetes,

      helm,

      oci,
    };
  })();

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,
  ) {}
}
