import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from './authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Oke_Apps_HomeL2tpVpnProxy_Stack } from './home-l2tp-vpn-proxy.stack';
import { K8S_Oke_Apps_Istio_Gateway_Stack } from './istio.gateway.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import {
  AbstractStack,
  IstioAuthorizationPolicy,
  IstioVirtualService,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Application as AuthentikApplication } from '@lib/terraform/providers/authentik/application';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { ProviderProxy } from '@lib/terraform/providers/authentik/provider-proxy';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_Cloudbeaver_Stack extends AbstractStack {
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

      authentik: this.provide(
        AuthentikProvider,
        'authentikProvider',
        () =>
          this.k8sOkeAppsAuthentikStack.authentikProviderConfig.shared.config,
      ),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.cloudbeaver,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  service = this.provide(ServiceV1, 'service', () => ({
    metadata: {
      name: this.metadata.shared.services.cloudbeaver.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.cloudbeaver.labels,
      port: Object.values(this.metadata.shared.services.cloudbeaver.ports),
    },
  }));

  workspacePersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'workspacePersistentVolumeClaim',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        storageClassName:
          this.k8sOkeAppsNfsStack.release.shared.storageClassName,
        accessModes: ['ReadWriteMany'],
        resources: {
          requests: {
            storage: '100Mi',
          },
        },
      },
    }),
  );

  deployment = this.provide(DeploymentV1, 'deployment', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      replicas: '1',
      selector: {
        matchLabels: this.metadata.shared.services.cloudbeaver.labels,
      },
      template: {
        metadata: {
          labels: this.metadata.shared.services.cloudbeaver.labels,
        },
        spec: {
          container: [
            {
              name: this.metadata.shared.services.cloudbeaver.name,
              image: 'dbeaver/cloudbeaver:latest',
              imagePullPolicy: 'Always',
              ports: Object.values(
                this.metadata.shared.services.cloudbeaver.ports,
              ).map<DeploymentV1SpecTemplateSpecContainerPort>(eachPort => ({
                containerPort: parseInt(eachPort.targetPort),
                protocol: eachPort.protocol,
              })),
              livenessProbe: {
                httpGet: {
                  path: '/',
                  port: this.metadata.shared.services.cloudbeaver.ports.cloudbeaver.targetPort.toString(),
                },
                initialDelaySeconds: 100,
                periodSeconds: 100,
                timeoutSeconds: 10,
              },
              env: [
                {
                  name: 'JAVA_OPTS',
                  value: `-DsocksProxyHost=${this.k8sOkeAppsHomeL2tpVpnProxyStack.service.shared.proxyHost} -DsocksProxyPort=${this.k8sOkeAppsHomeL2tpVpnProxyStack.service.shared.proxyPort}`,
                },
              ],
              volumeMount: [
                {
                  name: this.workspacePersistentVolumeClaim.element.metadata
                    .name,
                  mountPath: '/opt/cloudbeaver/workspace',
                },
              ],
            },
          ],
          volume: [
            {
              name: this.workspacePersistentVolumeClaim.element.metadata.name,
              persistentVolumeClaim: {
                claimName:
                  this.workspacePersistentVolumeClaim.element.metadata.name,
              },
            },
          ],
        },
      },
    },
  }));

  virtualService = this.provide(IstioVirtualService, 'virtualService', id => ({
    manifest: {
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        hosts: [this.cloudflareRecordOkeStack.dbRecord.element.name],
        gateways: [
          this.k8sOkeAppsIstioGatewayStack.istioIngressGateway.shared
            .gatewayPath,
        ],
        http: [
          {
            route: [
              {
                destination: {
                  host: this.service.element.metadata.name,
                  port: {
                    number:
                      this.metadata.shared.services.cloudbeaver.ports
                        .cloudbeaver.port,
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
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      mode: 'forward_single',
      internalHost: `http://${this.service.element.metadata.name}.${this.namespace.element.metadata.name}.svc.cluster.local`,
      externalHost: `https://${this.cloudflareRecordOkeStack.dbRecord.element.name}`,
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
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      slug: _.kebabCase(`${this.metadata.shared.namespace}-${id}`),
      protocolProvider: Fn.tonumber(this.authentikProxyProvider.element.id),
    }),
  );

  authorizationPolicy = this.provide(
    IstioAuthorizationPolicy,
    'authorizationPolicy',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
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
                      this.cloudflareRecordOkeStack.dbRecord.element.name,
                    ],
                    notPaths: ['/api/graphql'],
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
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly k8sOkeAppsHomeL2tpVpnProxyStack: K8S_Oke_Apps_HomeL2tpVpnProxy_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
    private readonly k8sOkeAppsIstioGatewayStack: K8S_Oke_Apps_Istio_Gateway_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Cloudbeaver_Stack.name,
      'Cloudbeaver for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsNfsStack);
    this.addDependency(this.k8sOkeAppsHomeL2tpVpnProxyStack);
    this.addDependency(this.k8sOkeAppsIstioStack);
  }
}
