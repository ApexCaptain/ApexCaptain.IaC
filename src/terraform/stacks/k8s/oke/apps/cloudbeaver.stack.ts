import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import _ from 'lodash';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { K8S_Oke_Apps_HomeL2tpVpnProxy_Stack } from './home-l2tp-vpn-proxy.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';

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
    },
  };

  private readonly metadata = this.provide(Resource, 'metadata', () => [
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

  ingress = this.provide(IngressV1, 'ingress', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'nginx.ingress.kubernetes.io/auth-url':
          this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
            .authUrl,
        'nginx.ingress.kubernetes.io/auth-signin':
          this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
            .authSignin,
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.dbRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.service.element.metadata.name,
                    port: {
                      number:
                        this.metadata.shared.services.cloudbeaver.ports
                          .cloudbeaver.port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly k8sOkeAppsHomeL2tpVpnProxyStack: K8S_Oke_Apps_HomeL2tpVpnProxy_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
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
