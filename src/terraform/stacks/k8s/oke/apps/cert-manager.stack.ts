import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_System_Stack } from '../system.stack';
import yaml from 'yaml';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Release } from '@lib/terraform/providers/helm/release';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import _ from 'lodash';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';

@Injectable()
export class K8S_Oke_Apps_CertManager_Stack extends AbstractStack {
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

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.certManager,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  cloudflareApiTokenSecret = this.provide(
    SecretV1,
    'cloudflareApiTokenSecret',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      data: {
        'api-token':
          this.globalConfigService.config.terraform.config.providers.cloudflare
            .ApexCaptain.apiToken,
      },
      type: 'Opaque',
    }),
  );

  certManagerRelease = this.provide(Release, 'certManagerRelease', () => {
    return {
      name: this.metadata.shared.helm.certManager.name,
      chart: this.metadata.shared.helm.certManager.chart,
      repository: this.metadata.shared.helm.certManager.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          crds: {
            enabled: true,
            keep: false,
          },
          enableCertificateOwnerRef: true,
        }),
      ],
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
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_CertManager_Stack.name,
      'Cert Manager for OKE k8s',
    );
  }
}
