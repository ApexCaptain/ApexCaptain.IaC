import { Injectable } from '@nestjs/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AbstractStack, createExpirationInterval } from '@/common';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_System_Stack } from '../system.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Fn, LocalBackend } from 'cdktf';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { CoreVolume } from '@lib/terraform/providers/oci/core-volume';
import { CoreVolumeBackupPolicy } from '@lib/terraform/providers/oci/core-volume-backup-policy';
import { CoreVolumeBackupPolicyAssignment } from '@lib/terraform/providers/oci/core-volume-backup-policy-assignment';
import { Project_Stack } from '@/terraform/stacks/project.stack';
import { K8S_Oke_Compartment_Stack } from '../compartment.stack';
import { PersistentVolumeV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-v1';
import _ from 'lodash';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { Release } from '@lib/terraform/providers/helm/release';
import path from 'path';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { ConfigMap } from '@lib/terraform/providers/kubernetes/config-map';
import yaml from 'yaml';
import dedent from 'dedent';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { TimeProvider } from '@lib/terraform/providers/time/provider';

// https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
@Injectable()
export class K8S_Oke_Apps_Nfs_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps.nfs;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
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
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  nfsCoreVolume = this.provide(CoreVolume, 'nfsCoreVolume', id => ({
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    availabilityDomain:
      this.projectStack.dataOciAvailabilityDomain.element.name,
    sizeInGbs: '100',
    displayName: id,
    lifecycle: {
      preventDestroy: true,
    },
  }));

  /**
   * @note
   * - 매주 일요일 2시에 증분 백업, 3주 동안 보관
   * - 매월 1일 3시에 전체 백업, 2달 동안 보관
   */
  nfsCoreVolumeBackupPolicy = this.provide(
    CoreVolumeBackupPolicy,
    'nfsCoreVolumeBackupPolicy',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      schedules: [
        {
          backupType: 'INCREMENTAL',
          period: 'ONE_WEEK',
          retentionSeconds: 60 * 60 * 24 * 7 * 3,
          dayOfWeek: 'SUNDAY',
          hourOfDay: 2,
          offsetSeconds: 0,
          offsetType: 'STRUCTURED',
          timeZone: 'REGIONAL_DATA_CENTER_TIME',
        },
        {
          backupType: 'FULL',
          period: 'ONE_MONTH',
          retentionSeconds: 60 * 60 * 24 * 30 * 2,
          dayOfMonth: 1,
          hourOfDay: 3,
          offsetSeconds: 0,
          offsetType: 'STRUCTURED',
          timeZone: 'REGIONAL_DATA_CENTER_TIME',
        },
      ],
    }),
  );

  nfsCoreVolumeBackupPolicyAssignment = this.provide(
    CoreVolumeBackupPolicyAssignment,
    'nfsCoreVolumeBackupPolicyAssignment',
    () => ({
      assetId: this.nfsCoreVolume.element.id,
      policyId: this.nfsCoreVolumeBackupPolicy.element.id,
    }),
  );

  privateKeyExpiration = this.provide(
    StaticResource,
    `privateKeyExpiration`,
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          days: 60,
        }).toString(),
      },
    }),
  );

  privateKey = this.provide(Resource, 'privateKey', idPrefix => {
    const expirationElement = this.privateKeyExpiration.element;
    const key = this.provide(PrivateKey, `${idPrefix}-key`, () => ({
      algorithm: 'RSA',
      rsaBits: 4096,
      lifecycle: {
        replaceTriggeredBy: [
          `${expirationElement.terraformResourceType}.${expirationElement.friendlyUniqueId}`,
        ],
      },
    }));

    const privateSshKeyFileInSecrets = this.provide(
      SensitiveFile,
      `${idPrefix}-privateSshKeyFileInSecrets`,
      id => ({
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .generatedKeyFilesDirPaths.relativeSecretsDirPath,
          `${K8S_Oke_Apps_Nfs_Stack.name}-${id}.key`,
        ),
        content: key.element.privateKeyOpenssh,
      }),
    );

    return [
      {},
      {
        key,
        privateSshKeyFileInSecrets,
      },
    ];
  });

  nfsPersistentVolume = this.provide(
    PersistentVolumeV1,
    'nfsPersistentVolume',
    id => ({
      metadata: {
        name: _.kebabCase(id),
        annotations: {
          'pv.kubernetes.io/provisioned-by': 'blockvolume.csi.oraclecloud.com',
        },
      },
      spec: [
        {
          nodeAffinity: {
            required: {
              nodeSelectorTerm: [
                {
                  matchExpressions: [
                    {
                      key: 'failure-domain.beta.kubernetes.io/zone',
                      operator: 'In',
                      values: [
                        Fn.element(
                          Fn.split(
                            ':',
                            this.projectStack.dataOciAvailabilityDomain.element
                              .name,
                          ),
                          1,
                        ),
                      ],
                    },
                  ],
                },
              ],
            },
          },
          storageClassName: 'oci-bv',
          persistentVolumeReclaimPolicy: 'Retain',
          capacity: {
            storage: `${this.nfsCoreVolume.element.sizeInGbs}Gi`,
          },
          accessModes: ['ReadWriteOnce'],
          persistentVolumeSource: {
            csi: {
              driver: 'blockvolume.csi.oraclecloud.com',
              volumeHandle: this.nfsCoreVolume.element.id,
              fsType: 'ext4',
            },
          },
        },
      ],
    }),
  );

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.nfs,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  sftpConfigMap = this.provide(ConfigMap, 'sftpConfigMap', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      'ssh-public-key': this.privateKey.shared.key.element.publicKeyOpenssh,
    },
  }));

  persistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'persistentVolumeClaim',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        volumeName: this.nfsPersistentVolume.element.metadata.name,
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: `${this.nfsCoreVolume.element.sizeInGbs}Gi`,
          },
        },
        storageClassName: 'oci-bv',
      },
    }),
  );

  service = this.provide(ServiceV1, 'service', () => ({
    metadata: {
      name: this.metadata.shared.services.nfs.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.nfs.labels,
      port: Object.values(this.metadata.shared.services.nfs.ports),
    },
  }));

  deployment = this.provide(DeploymentV1, 'deployment', id => {
    const nfsStoragePath = '/exports';
    const nfsSharedServiceDirName = 'services';
    const nfsSharedServiceDirPath = path.join(
      nfsStoragePath,
      nfsSharedServiceDirName,
    );

    const fbSrvDirContainerPath = '/srv';
    const fbDatbaseFileName = 'database.db';
    const fbDatabaseVolumeDirPath = 'fb-database';
    const fbDatabaseFileDirContainerPath = '/database';
    const fbDatabaseFileContainerPath = path.join(
      fbDatabaseFileDirContainerPath,
      fbDatbaseFileName,
    );

    const sftpDataDirName = 'data';
    const sftpDataDirContainerPath = path.join(
      'home',
      this.config.sftp.userName,
      sftpDataDirName,
    );

    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          replicas: '1',
          selector: {
            matchLabels: this.metadata.shared.services.nfs.labels,
          },
          template: {
            metadata: {
              labels: this.metadata.shared.services.nfs.labels,
            },
            spec: {
              initContainer: [
                {
                  name: 'init-filebrowser-db',
                  image: 'busybox:1.35',
                  command: [
                    '/bin/sh',
                    '-c',
                    `mkdir -p ${path.join(nfsStoragePath, fbDatabaseVolumeDirPath)} && chown -R 1000:1000 ${path.join(nfsStoragePath, fbDatabaseVolumeDirPath)} && chmod -R 755 ${path.join(nfsStoragePath, fbDatabaseVolumeDirPath)}`,
                  ],
                  volumeMount: [
                    {
                      name: this.persistentVolumeClaim.element.metadata.name,
                      mountPath: nfsStoragePath,
                    },
                  ],
                },
              ],
              container: [
                {
                  name: this.metadata.shared.services.nfs.ports.nfs.name,
                  image: 'itsthenetwork/nfs-server-alpine:latest-arm',
                  imagePullPolicy: 'Always',
                  port: [
                    {
                      containerPort:
                        this.metadata.shared.services.nfs.ports.nfs.port,
                      protocol:
                        this.metadata.shared.services.nfs.ports.nfs.protocol,
                    },
                  ],
                  securityContext: {
                    capabilities: {
                      add: ['SYS_ADMIN', 'SETPCAP'],
                    },
                  },
                  command: [
                    '/bin/sh',
                    '-c',
                    `mkdir -p ${nfsSharedServiceDirPath} && /usr/bin/nfsd.sh`,
                  ],
                  volumeMount: [
                    {
                      name: this.persistentVolumeClaim.element.metadata.name,
                      mountPath: nfsStoragePath,
                    },
                  ],
                  env: [
                    {
                      name: 'SHARED_DIRECTORY',
                      value: nfsStoragePath,
                    },
                    {
                      name: 'SHARED_DIRECTORY_2',
                      value: nfsSharedServiceDirPath,
                    },
                  ],
                },
                {
                  name: this.metadata.shared.services.nfs.ports['file-browser']
                    .name,
                  image: 'filebrowser/filebrowser',
                  imagePullPolicy: 'Always',
                  port: [
                    {
                      containerPort:
                        this.metadata.shared.services.nfs.ports['file-browser']
                          .port,
                      protocol:
                        this.metadata.shared.services.nfs.ports['file-browser']
                          .protocol,
                    },
                  ],
                  securityContext: {
                    runAsUser: '1000',
                    runAsGroup: '1000',
                    fsGroup: '1000',
                  },
                  volumeMount: [
                    {
                      name: this.persistentVolumeClaim.element.metadata.name,
                      mountPath: fbDatabaseFileDirContainerPath,
                      subPath: fbDatabaseVolumeDirPath,
                    },
                    {
                      name: this.persistentVolumeClaim.element.metadata.name,
                      mountPath: fbSrvDirContainerPath,
                      subPath: nfsSharedServiceDirName,
                    },
                  ],
                  env: [
                    {
                      name: 'FB_NOAUTH',
                      value: 'true',
                    },
                    {
                      name: 'FB_DATABASE',
                      value: fbDatabaseFileContainerPath,
                    },
                    {
                      name: 'FB_PORT',
                      value:
                        this.metadata.shared.services.nfs.ports['file-browser']
                          .targetPort,
                    },
                  ],
                },
                {
                  name: this.metadata.shared.services.nfs.ports.sftp.name,
                  image: 'jmcombs/sftp',
                  imagePullPolicy: 'Always',
                  command: [
                    'sh',
                    '-c',
                    `chmod o+w ${sftpDataDirContainerPath} && /entrypoint ${this.config.sftp.userName}::::${sftpDataDirName}`,
                  ],
                  port: [
                    {
                      containerPort:
                        this.metadata.shared.services.nfs.ports.sftp.port,
                      protocol:
                        this.metadata.shared.services.nfs.ports.sftp.protocol,
                    },
                  ],
                  volumeMount: [
                    {
                      mountPath: `/home/${this.config.sftp.userName}/.ssh/keys`,
                      name: this.sftpConfigMap.element.metadata.name,
                      readOnly: true,
                    },
                    {
                      name: this.persistentVolumeClaim.element.metadata.name,
                      mountPath: sftpDataDirContainerPath,
                      subPath: nfsSharedServiceDirName,
                    },
                  ],
                },
              ],

              volume: [
                {
                  name: this.persistentVolumeClaim.element.metadata.name,
                  persistentVolumeClaim: {
                    claimName: this.persistentVolumeClaim.element.metadata.name,
                  },
                },
                {
                  name: this.sftpConfigMap.element.metadata.name,
                  configMap: {
                    name: this.sftpConfigMap.element.metadata.name,
                  },
                },
              ],
            },
          },
        },
      },
      {
        nfsSharedServiceDirName,
      },
    ];
  });

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
        'nginx.ingress.kubernetes.io/auth-snippet': dedent`
          if ($request_uri ~ "/share") {
            return 200;
          }
          if ($request_uri ~ "/api/public/dl") {
            return 200;
          }
        `,
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.filesRecord.element.name}`,
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
                        this.metadata.shared.services.nfs.ports['file-browser']
                          .port,
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

  release = this.provide(Release, 'release', () => {
    const storageClassName = 'nfs-client';
    return [
      {
        name: this.metadata.shared.helm['nfs-subdir-external-provisioner'].name,
        chart:
          this.metadata.shared.helm['nfs-subdir-external-provisioner'].chart,
        repository:
          this.metadata.shared.helm['nfs-subdir-external-provisioner']
            .repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        dependsOn: [this.deployment.element],
        values: [
          yaml.stringify({
            nfs: {
              path: `/${this.deployment.shared.nfsSharedServiceDirName}`,
              server: this.service.element.spec.clusterIp,
            },
            storageClass: {
              storageClassName,
              accessModes: 'ReadWriteMany',
              pathPattern: '.pvc/$${.PVC.namespace}/$${.PVC.name}',
            },
          }),
        ],
      },
      { storageClassName },
    ];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Nfs_Stack.name,
      'Nfs for OKE k8s',
    );
  }
}
