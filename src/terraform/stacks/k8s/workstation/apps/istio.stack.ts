import { AbstractStack } from '@/common/abstract/abstract.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import yaml from 'yaml';
import { K8S_Workstation_Apps_Metallb_Stack } from './metallb.stack';
import { CertManagerCertificate, IstioGateway } from '@/common';
import _ from 'lodash';
import { K8S_Workstation_Apps_CertManager_Stack } from './cert-manager.stack';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks';

@Injectable()
export class K8S_Workstation_Apps_Istio_Stack extends AbstractStack {
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

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.istio,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  istioBaseRelease = this.provide(Release, 'istioBaseRelease', () => {
    return {
      name: this.metadata.shared.helm.base.name,
      chart: this.metadata.shared.helm.base.chart,
      repository: this.metadata.shared.helm.base.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          defaultRevision: 'default',
        }),
      ],
    };
  });

  istiodRelease = this.provide(Release, 'istiodRelease', () => {
    return {
      name: this.metadata.shared.helm.istiod.name,
      chart: this.metadata.shared.helm.istiod.chart,
      repository: this.metadata.shared.helm.istiod.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      dependsOn: [this.istioBaseRelease.element],
    };
  });

  // istioEastWestGatewayRelease = this.provide(
  //   Release,
  //   'istioEastWestGatewayRelease',
  //   () => {
  //     return {
  //       name: this.metadata.shared.helm.eastWestGateway.name,
  //       chart: this.metadata.shared.helm.eastWestGateway.chart,
  //       repository: this.metadata.shared.helm.eastWestGateway.repository,
  //       namespace: this.namespace.element.metadata.name,
  //       createNamespace: false,
  //       dependsOn: [this.istiodRelease.element],
  //       values: [
  //         yaml.stringify({
  //           labels: { istio: 'eastwestgateway' },
  //         }),
  //       ],
  //     };
  //   },
  // );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationAppsMetallbStack: K8S_Workstation_Apps_Metallb_Stack,
    private readonly k8sWorkstationAppsCertManagerStack: K8S_Workstation_Apps_CertManager_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Istio_Stack.name,
      'Istio stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsMetallbStack);
    this.addDependency(this.k8sWorkstationAppsCertManagerStack);
  }
}
