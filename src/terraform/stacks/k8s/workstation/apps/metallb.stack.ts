import { AbstractStack } from '@/common/abstract/abstract.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { Resource } from '@lib/terraform/providers/null/resource';
import { LocalBackend } from 'cdktf';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Release } from '@lib/terraform/providers/helm/release';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { MetallbIpAddressPool, MetallbL2Advertisement } from '@/common';
import _ from 'lodash';

@Injectable()
export class K8S_Workstation_Apps_Metallb_Stack extends AbstractStack {
  config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.apps
      .metallb;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation()
              .configPath,
          insecure: true,
        },
      })),
    },
  };

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.metallb,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  metallbRelease = this.provide(Release, 'metallbRelease', () => {
    return {
      name: this.metadata.shared.helm.metallb.name,
      chart: this.metadata.shared.helm.metallb.chart,
      repository: this.metadata.shared.helm.metallb.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
    };
  });

  ipAddressPool = this.provide(MetallbIpAddressPool, 'ipAddressPool', id => {
    const name = `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`;
    return [
      {
        manifest: {
          metadata: {
            name,
            namespace: this.namespace.element.metadata.name,
          },
          spec: {
            addresses: [this.config.loadbalancerIpRange],
          },
        },
        dependsOn: [this.metallbRelease.element],
      },
      {
        name,
      },
    ];
  });

  l2Advertisement = this.provide(
    MetallbL2Advertisement,
    'l2Advertisement',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          ipAddressPools: [this.ipAddressPool.shared.name],
        },
      },
      dependsOn: [this.ipAddressPool.element],
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Metallb_Stack.name,
      'Metallb stack for workstation k8s',
    );
  }
}
