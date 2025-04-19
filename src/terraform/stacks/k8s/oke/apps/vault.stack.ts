import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { AbstractStack, convertJsonToHelmSet } from '@/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_IngressController_Stack } from './ingress-controller.stack';
import {
  Cloudflare_Zone_Stack,
  Cloudflare_Record_Stack,
} from '@/terraform/stacks/cloudflare';
import { Resource } from '@lib/terraform/providers/null/resource';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Release } from '@lib/terraform/providers/helm/release';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';

@Injectable()
export class K8S_Oke_Apps_Vault_Stack extends AbstractStack {
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
    this.k8sOkeSystemStack.applicationMetadata.shared.vault,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  // release = this.provide(Release, 'release', () => {
  //   const { helmSet, helmSetList } = convertJsonToHelmSet({
  //     server: {
  //       dataStorage: {
  //         enabled: true,
  //         size: '10Gi',
  //         // storageClass
  //       },
  //     },
  //   });

  //   return {
  //     name: this.metadata.shared.helm.vault.name,
  //     chart: this.metadata.shared.helm.vault.chart,
  //     repository: this.metadata.shared.helm.vault.repository,
  //     namespace: this.namespace.element.metadata.name,
  //     createNamespace: false,
  //     setSensitive: helmSet,
  //     setList: helmSetList,
  //   };
  // });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsIngressControllerStack: K8S_Oke_Apps_IngressController_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Vault_Stack.name,
      'Vault stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsIngressControllerStack);
    this.addDependency(this.k8sOkeAppsNfsStack);
  }
}
