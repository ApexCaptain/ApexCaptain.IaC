import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Istio_Gateway_Stack } from './istio.gateway.stack';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import {
  K8S_Oke_Apps_Authentik_Resources_Stack,
  K8S_Oke_Apps_Authentik_Stack,
} from '../../oke';
import {
  AbstractStack,
  IstioAuthorizationPolicy,
  IstioVirtualService,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Workstation_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Application as AuthentikApplication } from '@lib/terraform/providers/authentik/application';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { ProviderProxy } from '@lib/terraform/providers/authentik/provider-proxy';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Apps_Windows_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.apps
      .windows;

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
    this.k8sWorkstationSystemStack.applicationMetadata.shared.windows,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  windowsService = this.provide(ServiceV1, 'windowsService', () => ({
    metadata: {
      name: this.metadata.shared.services.windows.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.windows.labels,
      port: Object.values(this.metadata.shared.services.windows.ports),
    },
  }));

  windowsPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'windowsPersistentVolumeClaim',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        storageClassName:
          this.k8sWorkstationLonghornStack.longhornSsdStorageClass.element
            .metadata.name,
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '64Gi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  windowsUserCredentialSecret = this.provide(
    SecretV1,
    'windowsUserCredentialSecret',
    id => {
      const userNameKey = 'username';
      const passwordKey = 'password';
      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          data: {
            [userNameKey]: this.config.username,
            [passwordKey]: this.config.password,
          },
        },
        {
          userNameKey,
          passwordKey,
        },
      ];
    },
  );

  windowsOemAssetsConfigmap = this.provide(
    ConfigMapV1,
    'windowsOemAssetsConfigmap',
    id => {
      const assetsDirPath = path.join(
        process.cwd(),
        'assets/static/windows/oem',
      );
      return {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        data: Object.fromEntries(
          fs
            .readdirSync(assetsDirPath)
            .map(eachFileName => [
              eachFileName,
              Fn.file(path.join(assetsDirPath, eachFileName)),
            ]),
        ),
      };
    },
  );

  windowsDeployment = this.provide(DeploymentV1, 'windowsDeployment', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      replicas: '1',
      selector: {
        matchLabels: this.metadata.shared.services.windows.labels,
      },
      template: {
        metadata: {
          labels: this.metadata.shared.services.windows.labels,
        },
        spec: {
          container: [
            {
              name: 'windows',
              image: 'dockurr/windows',
              env: [
                {
                  name: 'VERSION',
                  value: '11',
                },
                {
                  name: 'CPU_CORES',
                  value: '2',
                },
                {
                  name: 'RAM_SIZE',
                  value: '4G',
                },
                {
                  name: 'DISK_SIZE',
                  value: '64G',
                },
                {
                  name: 'LANGUAGE',
                  value: 'Korean',
                },
                {
                  name: 'REGION',
                  value: 'ko-KR',
                },
                {
                  name: 'KEYBOARD',
                  value: 'ko-KR',
                },
                {
                  name: 'USERNAME',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.windowsUserCredentialSecret.element.metadata
                        .name,
                      key: this.windowsUserCredentialSecret.shared.userNameKey,
                    },
                  },
                },
                {
                  name: 'PASSWORD',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.windowsUserCredentialSecret.element.metadata
                        .name,
                      key: this.windowsUserCredentialSecret.shared.passwordKey,
                    },
                  },
                },
              ],
              port: [
                {
                  containerPort:
                    this.metadata.shared.services.windows.ports.http.port,
                  name: this.metadata.shared.services.windows.ports.http.name,
                  protocol:
                    this.metadata.shared.services.windows.ports.http.protocol,
                },
                {
                  containerPort:
                    this.metadata.shared.services.windows.ports['rdp-tcp'].port,
                  name: this.metadata.shared.services.windows.ports['rdp-tcp']
                    .name,
                  protocol:
                    this.metadata.shared.services.windows.ports['rdp-tcp']
                      .protocol,
                },
                {
                  containerPort:
                    this.metadata.shared.services.windows.ports['rdp-udp'].port,
                  name: this.metadata.shared.services.windows.ports['rdp-udp']
                    .name,
                  protocol:
                    this.metadata.shared.services.windows.ports['rdp-udp']
                      .protocol,
                },
                {
                  containerPort:
                    this.metadata.shared.services.windows.ports.vnc.port,
                  name: this.metadata.shared.services.windows.ports.vnc.name,
                  protocol:
                    this.metadata.shared.services.windows.ports.vnc.protocol,
                },
              ],
              securityContext: {
                capabilities: {
                  add: ['NET_ADMIN'],
                },
                privileged: true,
              },
              volumeMount: [
                {
                  name: this.windowsPersistentVolumeClaim.element.metadata.name,
                  mountPath: '/storage',
                },
                {
                  name: this.windowsOemAssetsConfigmap.element.metadata.name,
                  mountPath: '/oem',
                },
                {
                  name: 'dev-kvm',
                  mountPath: '/dev/kvm',
                },
                {
                  name: 'dev-tun',
                  mountPath: '/dev/net/tun',
                },
              ],
            },
          ],
          terminationGracePeriodSeconds: 120,
          volume: [
            {
              name: this.windowsPersistentVolumeClaim.element.metadata.name,
              persistentVolumeClaim: {
                claimName:
                  this.windowsPersistentVolumeClaim.element.metadata.name,
              },
            },
            {
              name: this.windowsOemAssetsConfigmap.element.metadata.name,
              configMap: {
                name: this.windowsOemAssetsConfigmap.element.metadata.name,
              },
            },
            {
              name: 'dev-kvm',
              hostPath: {
                path: '/dev/kvm',
              },
            },
            {
              name: 'dev-tun',
              hostPath: {
                path: '/dev/net/tun',
                type: 'CharDevice',
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
        hosts: [
          this.cloudflareRecordWorkstationStack.windowsRecord.element.name,
        ],
        gateways: [
          this.k8sWorkstationAppsIstioGatewayStack.istioGateway.shared
            .gatewayPath,
        ],
        http: [
          {
            route: [
              {
                destination: {
                  host: this.windowsService.element.metadata.name,
                  port: {
                    number:
                      this.metadata.shared.services.windows.ports.http.port,
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
      internalHost: `http://${this.windowsService.element.metadata.name}.${this.namespace.element.metadata.name}.svc.cluster.local`,
      externalHost: `https://${this.cloudflareRecordWorkstationStack.windowsRecord.element.name}`,
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
          namespace:
            this.k8sWorkstationAppsIstioStack.namespace.element.metadata.name,
        },
        spec: {
          selector: {
            matchLabels: {
              istio: 'gateway',
            },
          },
          action: 'CUSTOM' as const,
          provider: {
            name: this.k8sWorkstationAppsIstioStack.istiodRelease.shared
              .authentikProxyProviderName,
          },
          rules: [
            {
              to: [
                {
                  operation: {
                    hosts: [
                      this.cloudflareRecordWorkstationStack.windowsRecord
                        .element.name,
                    ],
                    notPaths: ['/websockify'],
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

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareRecordWorkstationStack: Cloudflare_Record_Workstation_Stack,
    private readonly k8sWorkstationAppsIstioGatewayStack: K8S_Workstation_Apps_Istio_Gateway_Stack,
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Windows_Stack.name,
      'Windows stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationLonghornStack);
    this.addDependency(this.k8sWorkstationAppsIstioStack);
  }
}
