import { Injectable } from '@nestjs/common';
import {
  CloudBackendConfig,
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
    const cloudBackend = {
      ApexCaptain: {
        'ApexCaptain-IaC': (
          option:
            | { type: 'name'; name: string }
            | {
                type: 'tag';
                tags: string[];
              },
        ): CloudBackendConfig => {
          const apexCaptainCloudBakcned: Omit<
            CloudBackendConfig,
            'workspaces'
          > = {
            organization:
              this.config.backends.cloudBackend.ApexCaptain.organization,
            token: this.config.backends.cloudBackend.ApexCaptain.token,
          };
          switch (option.type) {
            case 'name':
              return {
                ...apexCaptainCloudBakcned,
                workspaces: new NamedCloudWorkspace(
                  option.name,
                  this.config.backends.cloudBackend.ApexCaptain.projects.iacProject,
                ),
              };
            case 'tag':
              return {
                ...apexCaptainCloudBakcned,
                workspaces: new TaggedCloudWorkspaces(
                  option.tags,
                  this.config.backends.cloudBackend.ApexCaptain.projects.iacProject,
                ),
              };
          }
        },
      },
    };

    return {
      /**
       * @see https://app.terraform.io
       */
      cloudBackend,
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
