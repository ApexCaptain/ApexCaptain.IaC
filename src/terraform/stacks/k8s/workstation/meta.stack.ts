import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

import { TlsProvider } from '@lib/terraform/providers/tls/provider';

@Injectable()
export class K8S_Workstation_Meta_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () =>
        this.terraformConfigService.providers.helm.ApexCaptain.workstation(),
      ),
    },
  };

  namespaces = this.provide(Resource, 'namespaces', prefix => {
    const utility = this.provide(Namespace, `${prefix}_utility`, () => ({
      metadata: {
        name: 'utility',
      },
    }));

    const personnel = this.provide(Namespace, `${prefix}_personnel`, () => ({
      metadata: {
        name: 'personnel',
      },
    }));

    return [
      {},
      {
        utility,
        personnel,
      },
    ];
  });

  meta = this.provide(Resource, 'meta', () => {
    const cloudbeaver = {
      namespace: this.namespaces.shared.utility.element.metadata.name,
      labels: {
        app: 'cloudbeaver',
      },
      port: {
        workspace: {
          containerPort: 8978,
          servicePort: 8978,
        },
      },
      volume: {
        workspace: {
          containerDirPath: '/opt/cloudbeaver/workspace',
          hostDirPath: path.join(
            this.globalConfigService.config.terraform.stacks.k8s.workstation
              .meta.workstationMountDirPath.ssdVolume,
            'cloudbeaver-workspace',
          ),
          volumeName: 'cloudbeaver-workspace',
        },
      },
    };

    const sftp = {
      secrets: {
        userName: 'sftpUser',
      },
      namespace: this.namespaces.shared.personnel.element.metadata.name,
      labels: {
        app: 'sftp',
      },
      port: {
        sftp: {
          containerPort: 22,
          servicePort: 22,
        },
      },
    };

    return [{}, { cloudbeaver, sftp }];
  });

  helmReleases = this.provide(Resource, 'helmReleases', prefix => {
    const ingressNginx = this.provide(
      Release,
      `${prefix}_ingressNginx`,
      () => ({
        name: 'ingress-nginx',
        repository: 'https://kubernetes.github.io/ingress-nginx',
        chart: 'ingress-nginx',
      }),
    );

    return [{}, { ingressNginx }];
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Meta_Stack.name,
      'Meta stack for Workstation k8s',
    );
  }
}
