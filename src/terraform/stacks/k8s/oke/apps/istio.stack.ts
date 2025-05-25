import { AbstractStack } from '@/common/abstract/abstract.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Network_Stack } from '../network.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import yaml from 'yaml';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare';
import _ from 'lodash';
@Injectable()
export class K8S_Oke_Apps_Istio_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        }),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        },
      })),
    },
  };

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.istio,
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

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Istio_Stack.name,
      'Istio stack for OKE k8s',
    );
  }
}
