import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Cloudflare_Record_Stack } from '../cloudflare';
import { Repository } from '@lib/terraform/providers/github/repository';
import { Branch } from '@lib/terraform/providers/github/branch';
import { GithubProvider } from '@lib/terraform/providers/github/provider';

@Injectable()
export class Project_GithubIO_Stack extends AbstractStack {
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
    },
  };

  githubIoRepository = this.provide(Repository, 'githubIoRepository', () => {
    const ghPagesBranchName = 'gh-pages';
    return [
      {
        name: `${this.globalConfigService.config.terraform.config.providers.github.ApexCaptain.owner}.github.io`,
        description: 'GitHub Pages repository',
        visibility: 'public',
        autoInit: true,
        homepageUrl: `https://${this.cloudflareRecordStack.blogRecord.element.name}`,
        pages: {
          source: {
            branch: ghPagesBranchName,
            path: '/',
          },
          cname: this.cloudflareRecordStack.blogRecord.element.name,
        },
        lifecycle: {
          preventDestroy: true,
        },
      },
      { ghPagesBranchName },
    ];
  });

  ghPagesBranch = this.provide(Branch, 'ghPagesBranch', () => ({
    repository: this.githubIoRepository.element.name,
    branch: this.githubIoRepository.shared.ghPagesBranchName,
    lifecycle: {
      preventDestroy: true,
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Project_GithubIO_Stack.name,
      'Project Github IO Stack',
    );
  }
}
