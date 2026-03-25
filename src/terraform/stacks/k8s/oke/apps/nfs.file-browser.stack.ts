import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from './authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Oke_Apps_Istio_Gateway_Stack } from './istio.gateway.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import {
  AbstractStack,
  IstioAuthorizationPolicy,
  IstioVirtualService,
} from '@/common';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Application as AuthentikApplication } from '@lib/terraform/providers/authentik/application';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { ProviderProxy } from '@lib/terraform/providers/authentik/provider-proxy';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Oke_Apps_Nfs_File_Browser_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      authentik: this.provide(
        AuthentikProvider,
        'authentikProvider',
        () =>
          this.k8sOkeAppsAuthentikStack.authentikProviderConfig.shared.config,
      ),

      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  virtualService = this.provide(IstioVirtualService, 'virtualService', id => ({
    manifest: {
      metadata: {
        name: `${this.k8sOkeAppsNfsStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.k8sOkeAppsNfsStack.namespace.element.metadata.name,
      },
      spec: {
        hosts: [this.cloudflareRecordOkeStack.filesRecord.element.name],
        gateways: [
          this.k8sOkeAppsIstioGatewayStack.istioIngressGateway.shared
            .gatewayPath,
        ],
        http: [
          {
            route: [
              {
                destination: {
                  host: this.k8sOkeAppsNfsStack.service.element.metadata.name,
                  port: {
                    number:
                      this.k8sOkeAppsNfsStack.metadata.shared.services.nfs
                        .ports['file-browser'].port,
                  },
                },
              },
            ],
          },
        ],
      },
    },
  }));

  authentikProxyProvider = this.provide(
    ProviderProxy,
    'authentikProxyProvider',
    id => ({
      name: _.startCase(
        `${this.k8sOkeAppsNfsStack.metadata.shared.namespace}-${id}`,
      ),
      mode: 'forward_single',
      internalHost: `http://${this.k8sOkeAppsNfsStack.service.element.metadata.name}.${this.k8sOkeAppsNfsStack.namespace.element.metadata.name}.svc.cluster.local`,
      externalHost: `https://${this.cloudflareRecordOkeStack.filesRecord.element.name}`,
      authorizationFlow:
        this.k8sOkeAppsAuthentikResourcesStack
          .dataDefaultProviderAuthorizationImplicitConsent.element.id,
      invalidationFlow:
        this.k8sOkeAppsAuthentikResourcesStack.dataDefaultInvalidationFlow
          .element.id,
    }),
  );

  authentikApplication = this.provide(
    AuthentikApplication,
    'authentikApplication',
    id => ({
      name: _.startCase(
        `${this.k8sOkeAppsNfsStack.metadata.shared.namespace}-${id}`,
      ),
      slug: _.kebabCase(
        `${this.k8sOkeAppsNfsStack.metadata.shared.namespace}-${id}`,
      ),
      protocolProvider: Fn.tonumber(this.authentikProxyProvider.element.id),
    }),
  );

  authorizationPolicy = this.provide(
    IstioAuthorizationPolicy,
    'authorizationPolicy',
    id => ({
      manifest: {
        metadata: {
          name: `${this.k8sOkeAppsNfsStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.k8sOkeAppsIstioStack.namespace.element.metadata.name,
        },
        spec: {
          selector: {
            matchLabels: {
              istio:
                this.k8sOkeAppsIstioStack.istioEastWestGatewayRelease.shared
                  .istioLabel,
            },
          },
          action: 'CUSTOM' as const,
          provider: {
            name: this.k8sOkeAppsIstioStack.istiodRelease.shared
              .okeAuthentikProxyProviderName,
          },
          rules: [
            {
              to: [
                {
                  operation: {
                    hosts: [
                      this.cloudflareRecordOkeStack.filesRecord.element.name,
                    ],
                    notPaths: ['/share', '/api/public/dl'],
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  );
  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly k8sOkeAppsIstioGatewayStack: K8S_Oke_Apps_Istio_Gateway_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Nfs_File_Browser_Stack.name,
      'Nfs file browser for OKE k8s',
    );
  }
}
