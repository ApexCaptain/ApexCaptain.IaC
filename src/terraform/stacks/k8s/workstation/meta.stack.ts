import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Meta_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.meta;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stateId: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
    },
  };

  bytebaseMeta = this.provide(Resource, 'bytebaseMeta', () => {
    const labels = {
      app: 'bytebase',
    };
    const properties = {
      port: {
        containerPort: 8080,
        servicePort: 31623,
        nodePort: 31623,
      },
      volume: {
        containerDataDirPath: '/var/opt/bytebase',
        hostDataDirPath: path.join(
          this.config.workstationMountDirPath.ssdVolume,
          'bytebase',
        ),
        dataVolumeName: 'bytebase-data',
      },
    };
    return [{}, { labels, properties }];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Meta_Stack.name,
      'Meta stack for Workstation k8s',
    );
  }
}
