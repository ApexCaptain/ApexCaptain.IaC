import { AbstractStack, createExpirationInterval } from '@/common';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { TerraformAppService } from '../terraform.app.service';
import { TerraformConfigService } from '../terraform.config.service';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Branch } from '@lib/terraform/providers/github/branch';
import { Repository } from '@lib/terraform/providers/github/repository';
import { RepositoryWebhook } from '@lib/terraform/providers/github/repository-webhook';
import { StringResource } from '@lib/terraform/providers/random/string-resource';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { Cloudflare_Record_Stack } from './cloudflare/record.stack';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { TimeProvider } from '@lib/terraform/providers/time/provider';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { RepositoryDeployKey } from '@lib/terraform/providers/github/repository-deploy-key';

@Injectable()
export class GitOps_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  gitOpsGithubRepository = this.provide(
    Repository,
    'gitOpsGithubRepository',
    () => ({
      name: `${this.globalConfigService.config.terraform.config.providers.github.ApexCaptain.owner}.GitOps`,
      description: 'GitOps repository',
      visibility: 'public',
      autoInit: true,
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  developBranch = this.provide(Branch, 'developBranch', () => ({
    repository: this.gitOpsGithubRepository.element.name,
    branch: 'develop',
  }));

  deployKeyExpiration = this.provide(
    StaticResource,
    'deployKeyExpiration',
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          days: 15,
        }).toString(),
      },
    }),
  );

  deployKeyPrivateKy = this.provide(PrivateKey, 'deployKeyPrivateKy', () => ({
    algorithm: 'RSA',
    rsaBits: 4096,
    lifecycle: {
      replaceTriggeredBy: [
        `${this.deployKeyExpiration.element.terraformResourceType}.${this.deployKeyExpiration.element.friendlyUniqueId}`,
      ],
    },
  }));

  deployKey = this.provide(RepositoryDeployKey, 'deployKey', () => ({
    title: 'GitOps Deploy Key for ArgoCD',
    repository: this.gitOpsGithubRepository.element.name,
    key: this.deployKeyPrivateKy.element.publicKeyOpenssh,
    readOnly: false,
  }));

  webHookKey = this.provide(StringResource, 'argoCdWebHookKey', () => ({
    length: 32,
    special: false,
    keepers: {
      expirationDate: createExpirationInterval({
        days: 30,
      }).toString(),
    },
  }));

  argoCdWebHook = this.provide(RepositoryWebhook, 'argoCdWebHook', () => ({
    repository: this.gitOpsGithubRepository.element.name,
    events: ['push'],
    configuration: {
      url: `https://${this.cloudflareRecordStack.argoCdRecord.element.name}/api/webhook`,
      contentType: 'json',
      secret: this.webHookKey.element.result,
      insecureSsl: false,
    },
    active: true,
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(terraformAppService.cdktfApp, GitOps_Stack.name, 'GitOps Stack');
  }
}
