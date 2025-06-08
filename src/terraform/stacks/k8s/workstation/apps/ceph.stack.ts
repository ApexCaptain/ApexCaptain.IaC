import { AbstractStack, CephCluster, CephBlockPool } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import yaml from 'yaml';
import { Resource } from '@lib/terraform/providers/null/resource';
import _ from 'lodash';
import { Release } from '@lib/terraform/providers/helm/release';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from '../../oke/apps/oauth2-proxy.stack';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { DataKubernetesSecretV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-secret-v1';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import path from 'path';

@Injectable()
export class K8S_Workstation_Apps_Ceph_Stack extends AbstractStack {
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
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
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

  // private readonly metadata = this.provide(Resource, 'metadata', () => [
  //   {},
  //   this.k8sWorkstationSystemStack.applicationMetadata.shared.ceph,
  // ]);

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.metadata.shared.namespace,
  //   },
  // }));

  // cephOperatorRelease = this.provide(Release, 'cephOperatorRelease', () => ({
  //   name: this.metadata.shared.helm.cephOperator.name,
  //   chart: this.metadata.shared.helm.cephOperator.chart,
  //   repository: this.metadata.shared.helm.cephOperator.repository,
  //   namespace: this.namespace.element.metadata.name,
  //   createNamespace: false,
  //   waitForJobs: true,
  //   values: [
  //     yaml.stringify({
  //       logLevel: 'DEBUG',
  //       csi: {
  //         provisionerReplicas: 1,
  //       },
  //     }),
  //   ],
  // }));

  /**
   *
   * watch -n 1 kubectl -n rook-ceph get all
   * 
   * kubectl delete configmap rook-ceph-detect-version -n rook-ceph
   * 
      kubectl delete crd \
        cephblockpoolradosnamespaces.ceph.rook.io \
        cephblockpools.ceph.rook.io \
        cephbucketnotifications.ceph.rook.io \
        cephbuckettopics.ceph.rook.io \
        cephclients.ceph.rook.io \
        cephclusters.ceph.rook.io \
        cephcosidrivers.ceph.rook.io \
        cephfilesystemmirrors.ceph.rook.io \
        cephfilesystems.ceph.rook.io \
        cephfilesystemsubvolumegroups.ceph.rook.io \
        cephnfses.ceph.rook.io \
        cephobjectrealms.ceph.rook.io \
        cephobjectstores.ceph.rook.io \
        cephobjectstoreusers.ceph.rook.io \
        cephobjectzonegroups.ceph.rook.io \
        cephobjectzones.ceph.rook.io \
        cephrbdmirrors.ceph.rook.io \
        objectbucketclaims.objectbucket.io \
        objectbuckets.objectbucket.io

   *
   */

  // sudo wipefs -a /dev/sda
  // sudo wipefs -a /dev/sdb

  // kubectl logs -n rook-ceph job/rook-ceph-osd-prepare-lshworkstation -f --tail 100
  // kubectl -n rook-ceph get secret rook-ceph-dashboard-password -o jsonpath="{['data']['password']}" | base64 --decode

  // sudo rm -rf /var/lib/rook

  // sudo sgdisk --zap-all /dev/sda
  // sudo sgdisk --zap-all /dev/sdb

  // sudo dd if=/dev/zero of=/dev/sda bs=1M count=1000
  // sudo dd if=/dev/zero of=/dev/sdb bs=1M count=1000

  // cephClusterRelease = this.provide(Release, 'cephClusterRelease', () => ({
  //   dependsOn: [this.cephOperatorRelease.element],
  //   name: this.metadata.shared.helm.cephCluster.name,
  //   chart: this.metadata.shared.helm.cephCluster.chart,
  //   repository: this.metadata.shared.helm.cephCluster.repository,
  //   namespace: this.namespace.element.metadata.name,
  //   createNamespace: false,
  //   waitForJobs: true,
  //   values: [
  //     yaml.stringify({
  //       toolbox: {
  //         enabled: true,
  //       },
  //       monitoring: {
  //         enabled: false,
  //       },
  //       cephClusterSpec: {
  //         mon: {
  //           count: 1,
  //         },
  //         mgr: {
  //           count: 1,
  //         },
  //         dashboard: {
  //           enabled: true,
  //           ssl: true,
  //         },
  //         storage: {
  //           useAllNodes: false,
  //           useAllDevices: false,
  //           nodes: [
  //             {
  //               name: 'lshworkstation',
  //               devices: [
  //                 {
  //                   name: '/dev/sda',
  //                   storeType: 'bluestore',
  //                   osdsPerDevice: '1',
  //                 },
  //                 {
  //                   name: '/dev/sdb',
  //                   storeType: 'bluestore',
  //                   osdsPerDevice: '1',
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //       },
  //       ingress: {
  //         dashboard: {
  //           annotations: {
  //             'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
  //             'nginx.ingress.kubernetes.io/rewrite-target': '/',

  //             'nginx.ingress.kubernetes.io/auth-url':
  //               this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
  //                 .authUrl,
  //             'nginx.ingress.kubernetes.io/auth-signin':
  //               this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
  //                 .authSignin,
  //           },
  //           host: {
  //             name: `${this.cloudflareRecordStack.cephRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
  //             path: '/',
  //             pathType: 'Prefix',
  //           },
  //           ingressClassName: 'nginx',
  //         },
  //       },

  //       // 추후 아래걸로 대체
  //       cephBlockPools: [],
  //       // cephBlockPools: [
  //       //   {
  //       //     name: 'ceph-ssd-blockpool',
  //       //     spec: {
  //       //       replicated: {
  //       //         size: 1,
  //       //         requireSafeReplicaSize: false,
  //       //       },
  //       //       deviceClass: 'ssd',
  //       //       parameters: {
  //       //         compression_mode: 'none',
  //       //       },
  //       //       mirroring: {
  //       //         enabled: false,
  //       //       },
  //       //       statusCheck: {
  //       //         mirror: {
  //       //           disabled: true,
  //       //           interval: '60s',
  //       //         },
  //       //       },
  //       //     },
  //       //     storageClass: {
  //       //       enabled: true,
  //       //       name: 'ceph-ssd-block',
  //       //       isDefault: true,
  //       //     },
  //       //   },
  //       //   {
  //       //     name: 'ceph-hdd-blockpool',
  //       //     spec: {
  //       //       replicated: {
  //       //         size: 1,
  //       //         requireSafeReplicaSize: false,
  //       //       },
  //       //       deviceClass: 'hdd',
  //       //       parameters: {
  //       //         compression_mode: 'none',
  //       //       },
  //       //       mirroring: {
  //       //         enabled: false,
  //       //       },
  //       //       statusCheck: {
  //       //         mirror: {
  //       //           disabled: true,
  //       //           interval: '60s',
  //       //         },
  //       //       },
  //       //     },
  //       //     storageClass: {
  //       //       enabled: true,
  //       //       name: 'ceph-hdd-block',
  //       //       isDefault: false,
  //       //     },
  //       //   },
  //       // ],
  //       cephFileSystems: [],
  //       cephObjectStores: [],
  //     }),
  //   ],
  // }));

  ////////////////////////////////////////////////////////////////////

  // cephCluster = this.provide(CephCluster, 'cephCluster', id => {
  //   return [
  //     {
  //       dependsOn: [this.cephOperatorRelease.element],
  //       metadata: {
  //         name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //         namespace: this.namespace.element.metadata.name,
  //       },
  //       spec: {
  //         cephVersion: {
  //           image: 'quay.io/ceph/ceph:v19.2.0',
  //         },
  //         dataDirHostPath: '/var/lib/rook',
  //         mon: {
  //           count: 1,
  //           allowMultiplePerNode: false,
  //         },
  //         dashboard: {
  //           enabled: true,
  //           ssl: true,
  //         },
  //         storage: {
  //           useAllNodes: false,
  //           useAllDevices: false,
  //           nodes: [
  //             {
  //               name: 'lshworkstation',
  //               devices: [
  //                 {
  //                   name: '/dev/sda',
  //                 },
  //                 {
  //                   name: '/dev/sdb',
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //       },
  //     },
  //     {
  //       dashboardService: {
  //         name: 'rook-ceph-mgr-dashboard',
  //         port: 8443,
  //       },
  //     },
  //   ];
  // });

  // ssdBlockPool = this.provide(CephBlockPool, 'ssdBlockPool', id => ({
  //   dependsOn: [this.cephCluster.element],
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     failureDomain: 'host',
  //     replicated: {
  //       size: 1,
  //       requireSafeReplicaSize: false,
  //     },
  //     deviceClass: 'ssd',
  //     parameters: {
  //       compression_mode: 'none',
  //     },
  //     mirroring: {
  //       enabled: false,
  //     },
  //     statusCheck: {
  //       mirror: {
  //         disabled: true,
  //         interval: '60s',
  //       },
  //     },
  //   },
  // }));

  // hddBlockPool = this.provide(CephBlockPool, 'hddBlockPool', id => ({
  //   dependsOn: [this.cephCluster.element],
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     failureDomain: 'host',
  //     replicated: {
  //       size: 1,
  //       requireSafeReplicaSize: false,
  //     },
  //     deviceClass: 'hdd',
  //     parameters: {
  //       compression_mode: 'none',
  //     },
  //     mirroring: {
  //       enabled: false,
  //     },
  //     statusCheck: {
  //       mirror: {
  //         disabled: true,
  //         interval: '60s',
  //       },
  //     },
  //   },
  // }));

  // dataCephDashboardPasswordSecret = this.provide(
  //   DataKubernetesSecretV1,
  //   'dataCephDashboardPasswordSecret',
  //   () => ({
  //     dependsOn: [this.cephCluster.element],
  //     metadata: {
  //       name: 'rook-ceph-dashboard-password',
  //       namespace: this.namespace.element.metadata.name,
  //     },
  //   }),
  // );

  // cephDashboardPasswordInfo = this.provide(
  //   SensitiveFile,
  //   'cephDashboardPassword',
  //   id => ({
  //     dependsOn: [this.cephCluster.element],
  //     filename: path.join(
  //       process.cwd(),
  //       this.globalConfigService.config.terraform.stacks.common
  //         .generatedKeyFilesDirPaths.relativeSecretsDirPath,
  //       `${K8S_Workstation_Apps_Ceph_Stack.name}-${id}.json`,
  //     ),
  //     content: JSON.stringify(
  //       {
  //         cephDashboardPassword: Fn.lookup(
  //           this.dataCephDashboardPasswordSecret.element.data,
  //           'password',
  //         ),
  //       },
  //       null,
  //       2,
  //     ),
  //   }),
  // );

  // ingress = this.provide(IngressV1, 'ingress', id => ({
  //   dependsOn: [this.cephCluster.element],
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //     annotations: {
  //       'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
  //       'nginx.ingress.kubernetes.io/rewrite-target': '/',

  //       'nginx.ingress.kubernetes.io/auth-url':
  //         this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
  //           .authUrl,
  //       'nginx.ingress.kubernetes.io/auth-signin':
  //         this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
  //           .authSignin,
  //     },
  //   },
  //   spec: {
  //     ingressClassName: 'nginx',
  //     rule: [
  //       {
  //         host: `${this.cloudflareRecordStack.cephRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
  //         http: {
  //           path: [
  //             {
  //               path: '/',
  //               pathType: 'Prefix',
  //               backend: {
  //                 service: {
  //                   name: this.cephCluster.shared.dashboardService.name,
  //                   port: {
  //                     number: this.cephCluster.shared.dashboardService.port,
  //                   },
  //                 },
  //               },
  //             },
  //           ],
  //         },
  //       },
  //     ],
  //   },
  // }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Ceph_Stack.name,
      'Ceph stack for workstation k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
