import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { Repository } from '@lib/terraform/providers/github/repository';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';

@Injectable()
export class Project_Examples_NoVncDesktopLiteFeature_Stack extends AbstractStack {
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

  noVncDesktopLiteFeatureRepository = this.provide(
    Repository,
    'noVncDesktopLiteFeatureRepository',
    () => ({
      name: 'postExample.noVncDesktopLiteFeature',
      visibility: 'public',
      autoInit: true,
      homepageUrl : 'https://blog.ayteneve93.com/p/dev/desktop-lite-devcontainer-feature/',
      description:
        '"DevContainer Desktop Lite Feature" 포스트의 예제 소스 코드 repository입니다.',
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      Project_Examples_NoVncDesktopLiteFeature_Stack.name,
      'Project Examples NoVnc Desktop Lite Feature Stack',
    );
  }
}
