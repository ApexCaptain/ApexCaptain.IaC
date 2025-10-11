import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { K8S_Workstation_System_Stack } from '../system.stack';
import _ from 'lodash';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from '../../oke';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import path from 'path';
import fs from 'fs';

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

  windowsIngress = this.provide(IngressV1, 'windowsIngress', id => ({
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
          host: this.cloudflareRecordStack.windowsRecord.element.name,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.windowsService.element.metadata.name,
                    port: {
                      number:
                        this.metadata.shared.services.windows.ports.http.port,
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

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Windows_Stack.name,
      'Windows stack for workstation k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
    this.addDependency(this.k8sWorkstationLonghornStack);
    this.addDependency(this.k8sWorkstationAppsIstioStack);
  }
}
