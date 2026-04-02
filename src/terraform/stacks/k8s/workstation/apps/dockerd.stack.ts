import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataExternal } from '@lib/terraform/providers/external/data-external';
import { ExternalProvider } from '@lib/terraform/providers/external/provider';
import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';

@Injectable()
export class K8S_Workstation_Apps_Dockerd_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      external: this.provide(ExternalProvider, 'externalProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  /*
  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.dockerd,
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
      name: this.metadata.shared.services.dockerd.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.dockerd.labels,
      port: Object.values(this.metadata.shared.services.dockerd.ports),
    },
  }));

  dockerDataPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'dockerDataPersistentVolumeClaim',
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
            storage: '20Gi',
          },
        },
      },
    }),
  );

  dockerCertPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'dockerCertPersistentVolumeClaim',
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
            storage: '1Mi',
          },
        },
      },
    }),
  );

  deployment = this.provide(Manifest, 'deployment', id => {
    const podLabelKeyForFetchDockerdClientCert = 'app.kubernetes.io/name';
    const podLabelValueForFetchDockerdClientCert = 'dockerd';
    const dockerdCertDirPath = '/certs';
    const dockerdServiceName = this.service.element.metadata.name;
    const dockerdNamespace = this.namespace.element.metadata.name;
    const internalDockerdTcpHostPath = `tcp://${dockerdServiceName}.${dockerdNamespace}.svc.cluster.local:${
      this.metadata.shared.services.dockerd.ports.dockerd.port
    }`;
    const internalDockerdTlsSans = [
      `${dockerdServiceName}`,
      `${dockerdServiceName}.${dockerdNamespace}`,
      `${dockerdServiceName}.${dockerdNamespace}.svc`,
      `${dockerdServiceName}.${dockerdNamespace}.svc.cluster.local`,
    ]
      .map(eachDns => `DNS:${eachDns}`)
      .join(',');

    return [
      {
        manifest: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          spec: {
            replicas: '1',
            strategy: {
              type: 'Recreate',
            },
            selector: {
              matchLabels: this.metadata.shared.services.dockerd.labels,
            },
            template: {
              metadata: {
                labels: {
                  ...this.metadata.shared.services.dockerd.labels,
                  [podLabelKeyForFetchDockerdClientCert]:
                    podLabelValueForFetchDockerdClientCert,
                },
              },
              spec: {
                runtimeClassName:
                  this.k8sWorkstationSystemStack.installSysboxManifest.shared
                    .runimeClassName,
                hostUsers: false,
                containers: [
                  {
                    name: this.metadata.shared.services.dockerd.name,
                    image: 'docker:29.3.1-dind-alpine3.23',
                    imagePullPolicy: 'Always',
                    env: [
                      {
                        name: 'DOCKER_TLS_CERTDIR',
                        value: dockerdCertDirPath,
                      },
                      {
                        name: 'DOCKER_TLS_SAN',
                        value: internalDockerdTlsSans,
                      },
                    ],
                    volumeMounts: [
                      {
                        name: this.dockerDataPersistentVolumeClaim.element
                          .metadata.name,
                        mountPath: '/var/lib/docker',
                      },
                      {
                        name: this.dockerCertPersistentVolumeClaim.element
                          .metadata.name,
                        mountPath: dockerdCertDirPath,
                      },
                    ],
                    readinessProbe: {
                      exec: {
                        command: ['sh', '-c', 'docker info >/dev/null 2>&1'],
                      },
                      initialDelaySeconds: 10,
                      periodSeconds: 5,
                      timeoutSeconds: 5,
                      failureThreshold: 12,
                      successThreshold: 1,
                    },
                  },
                ],
                volumes: [
                  {
                    name: this.dockerDataPersistentVolumeClaim.element.metadata
                      .name,
                    persistentVolumeClaim: {
                      claimName:
                        this.dockerDataPersistentVolumeClaim.element.metadata
                          .name,
                    },
                  },
                  {
                    name: this.dockerCertPersistentVolumeClaim.element.metadata
                      .name,
                    persistentVolumeClaim: {
                      claimName:
                        this.dockerCertPersistentVolumeClaim.element.metadata
                          .name,
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        podLabelKeyForFetchDockerdClientCert,
        podLabelValueForFetchDockerdClientCert,
        dockerdCertDirPath,
        internalDockerdTcpHostPath,
      },
    ];
  });

  fetchDockerdClientCert = this.provide(DataExternal, 'fetchClientCert', () => {
    const caPemKey = 'ca.pem';
    const certPemKey = 'cert.pem';
    const keyPemKey = 'key.pem';

    return [
      {
        dependsOn: [this.deployment.element],
        program: [
          'bash',
          '-c',
          dedent`
          ts-node ${path.join(process.cwd(), 'scripts', 'external', 'fetch-dockerd-client-cert.external.ts')} \
            --called-from-terraform \
            --kubeconfig ${this.k8sWorkstationK8SStack.kubeConfigFile.element.filename} \
            --namespace ${this.namespace.element.metadata.name} \
            --dockerd-pod-label-key ${this.deployment.shared.podLabelKeyForFetchDockerdClientCert} \
            --dockerd-pod-label-value ${this.deployment.shared.podLabelValueForFetchDockerdClientCert} \
            --dockerd-cert-dir-path ${this.deployment.shared.dockerdCertDirPath}
          `,
        ],
      },
      {
        caPemKey,
        certPemKey,
        keyPemKey,
      },
    ];
  });
  */

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Dockerd_Stack.name,
      'Dockerd stack for workstation k8s',
    );
  }
}
