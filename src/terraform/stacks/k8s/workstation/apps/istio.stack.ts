import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { IstioPeerAuthentication } from '@/common';
import { AbstractStack } from '@/common/abstract/abstract.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

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
    const authentikProxyOutpostName = 'workstation-authentik-proxy-outpost';
    const authentikProxyProviderName = 'workstation-authentik-proxy-provider';
    return [
      {
        name: this.metadata.shared.helm.istiod.name,
        chart: this.metadata.shared.helm.istiod.chart,
        repository: this.metadata.shared.helm.istiod.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        dependsOn: [this.istioBaseRelease.element],
        values: [
          yaml.stringify({
            meshConfig: {
              extensionProviders: [
                {
                  name: authentikProxyProviderName,
                  envoyExtAuthzHttp: {
                    service: `ak-outpost-${authentikProxyOutpostName}.${this.k8sWorkstationSystemStack.applicationMetadata.shared.authentik.namespace}.svc.cluster.local`,
                    port: '9000',
                    pathPrefix: '/outpost.goauthentik.io/auth/envoy',
                    headersToDownstreamOnAllow: ['set-cookie'],
                    headersToUpstreamOnAllow: ['x-authentik-*', 'cookie'],
                    includeRequestHeadersInCheck: ['cookie'],
                  },
                },
              ],
            },
          }),
        ],
      },
      {
        authentikProxyOutpostName,
        authentikProxyProviderName,
      },
    ];
  });

  istioGatewayRelease = this.provide(Release, 'istioGatewayRelease', () => {
    return {
      name: this.metadata.shared.helm.istioGateway.name,
      chart: this.metadata.shared.helm.istioGateway.chart,
      repository: this.metadata.shared.helm.istioGateway.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      dependsOn: [this.istioBaseRelease.element],
    };
  });

  defaultPeerAuthentication = this.provide(
    IstioPeerAuthentication,
    'defaultPeerAuthentication',
    () => ({
      manifest: {
        metadata: {
          name: 'default',
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          mtls: {
            mode: 'STRICT' as const,
          },
        },
      },
      dependsOn: [this.istioBaseRelease.element],
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Istio_Stack.name,
      'Istio stack for workstation k8s',
    );
  }
}
