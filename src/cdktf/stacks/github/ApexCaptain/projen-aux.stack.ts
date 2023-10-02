import { Injectable } from '@nestjs/common';
import { CloudBackend, NamedCloudWorkspace } from 'cdktf';
import { CdktfAppService } from '@cdktf/cdktf.app.service';
import { CdktfCredentialService } from '@cdktf/cdktf.credential.service';
import { AbstractStack } from '@common';
import { GithubProvider } from '@terraform/providers/github/provider';
import { Repository } from '@terraform/providers/github/repository';
import { LocalProvider } from '@terraform/providers/local/provider';

@Injectable()
export class GitHubApexCaptainProjenAuxStack extends AbstractStack {
  protected backendConfig = this.backend(CloudBackend, () => ({
    ...this.cdktfCredentialService.backendConfig.cloudBackend.ApexCaptain,
    workspaces: new NamedCloudWorkspace(this.id),
  }));

  protected providers = {
    local: this.provide(
      LocalProvider,
      'local-provider',
      () => this.cdktfCredentialService.providersConfig.local.default,
    ),
    github: this.provide(
      GithubProvider,
      'github-provider',
      () => this.cdktfCredentialService.providersConfig.github.ApexCaptain,
    ),
  };
  data = {};

  resources = {
    repository: this.provide(Repository, 'repo', () => ({
      name: 'projen-aux',
      description: 'Packages hub for projen auxiliaries',
      visibility: 'public',
      autoInit: true,
      lifecycle: {
        preventDestroy: true,
      },
    })),
  };

  constructor(
    // Cdktf Root
    readonly cdktfAppService: CdktfAppService,
    private readonly cdktfCredentialService: CdktfCredentialService,
  ) {
    super(cdktfAppService.cdktfApp, GitHubApexCaptainProjenAuxStack.name);
  }
}
