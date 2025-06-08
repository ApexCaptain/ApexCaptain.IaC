import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Injectable } from '@nestjs/common';
import { Resource } from '@lib/terraform/providers/null/resource';
import _ from 'lodash';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { LocalBackend } from 'cdktf';
import { K8S_Workstation_System_Stack } from '../system.stack';
import yaml from 'yaml';
import {
  Cloudflare_Zone_Stack,
  Cloudflare_Record_Stack,
} from '@/terraform/stacks/cloudflare';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from '../../oke';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { DataExternal } from '@lib/terraform/providers/external/data-external';
import { ExternalProvider } from '@lib/terraform/providers/external/provider';
import { StorageClassV1 } from '@lib/terraform/providers/kubernetes/storage-class-v1';
import dedent from 'dedent';
import path from 'path';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';

@Injectable()
export class K8S_Workstation_Apps_Longhorn_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.apps
      .longhorn;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      external: this.provide(ExternalProvider, 'externalProvider', () => ({})),
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

  // private readonly metadata = this.provide(Resource, 'metadata', () => [
  //   {},
  //   this.k8sWorkstationSystemStack.applicationMetadata.shared.longhorn,
  // ]);

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.metadata.shared.namespace,
  //   },
  // }));

  // release = this.provide(Release, 'release', () => {
  //   return {
  //     name: this.metadata.shared.helm.longhorn.name,
  //     chart: this.metadata.shared.helm.longhorn.chart,
  //     repository: this.metadata.shared.helm.longhorn.repository,
  //     namespace: this.namespace.element.metadata.name,
  //     createNamespace: false,
  //     waitForJobs: true,
  //     values: [
  //       yaml.stringify({
  //         ingress: {
  //           enabled: true,
  //           ingressClassName: 'nginx',
  //           host: `${this.cloudflareRecordStack.longhornRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
  //           annotations: {
  //             'nginx.ingress.kubernetes.io/rewrite-target': '/',
  //             'nginx.ingress.kubernetes.io/auth-url':
  //               this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
  //                 .authUrl,
  //             'nginx.ingress.kubernetes.io/auth-signin':
  //               this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
  //                 .authSignin,
  //           },
  //         },
  //         csi: { kubeletRootDir: '/var/lib/kubelet' },

  //         defaultSettings: {
  //           createDefaultDiskLabeledNodes: true,
  //           defaultReplicaCount: 1,

  //           deletingConfirmationFlag: true, // -- true: Allow to delete longhorn chart, false: Prevent to delete longhorn chart
  //         },
  //         persistence: {
  //           defaultClass: false,
  //         },
  //       }),
  //     ],
  //   };
  // });

  // manageLonghornNodeExternal = this.provide(
  //   Resource,
  //   'manageLonghornNodeExternal',
  //   id => {
  //     const nodes = this.config.nodes.map((eachNodeInfo, index) => {
  //       const disks = Object.fromEntries(
  //         eachNodeInfo.disks.map(({ name, path, isSsd }) => [
  //           name,
  //           {
  //             path,
  //             tags: isSsd ? ['ssd'] : ['hdd'],
  //           },
  //         ]),
  //       );

  //       const nodeStatus = this.provide(
  //         DataExternal,
  //         `${id}-${index}-node`,
  //         () => ({
  //           dependsOn: [this.release.element],
  //           program: [
  //             'bash',
  //             '-c',
  //             dedent`
  //               ts-node ${path.join(process.cwd(), 'scripts', 'external', 'manage-longhorn-node.external.ts')} \
  //                 --called-from-terraform \
  //                 --kubeconfig ${this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation().configPath} \
  //                 --namespace ${this.namespace.element.metadata.name} \
  //                 --node ${eachNodeInfo.name} \
  //                 --disks '${JSON.stringify(disks)}'
  //             `,
  //           ],
  //         }),
  //       );
  //       return nodeStatus;
  //     });
  //     return [{}, nodes];
  //   },
  // );

  // longhornSsdStorageClass = this.provide(
  //   StorageClassV1,
  //   'longhornSsdStorageClass',
  //   id => ({
  //     dependsOn: [this.release.element],
  //     metadata: {
  //       name: _.kebabCase(id),
  //       annotations: {
  //         'storageclass.kubernetes.io/is-default-class': 'true',
  //       },
  //     },
  //     storageProvisioner: 'driver.longhorn.io',
  //     allowVolumeExpansion: true,
  //     reclaimPolicy: 'Delete',
  //     parameters: {
  //       numberOfReplicas: '1',
  //       diskSelector: 'ssd',
  //       fsType: 'ext4',
  //       nfsOptions: 'vers=4.2,noresvport,softerr',
  //     },
  //   }),
  // );

  // longhornHddStorageClass = this.provide(
  //   StorageClassV1,
  //   'longhornHddStorageClass',
  //   id => ({
  //     dependsOn: [this.release.element],
  //     metadata: {
  //       name: _.kebabCase(id),
  //     },
  //     storageProvisioner: 'driver.longhorn.io',
  //     allowVolumeExpansion: true,
  //     reclaimPolicy: 'Delete',
  //     parameters: {
  //       numberOfReplicas: '1',
  //       diskSelector: 'hdd',
  //       fsType: 'ext4',
  //       nfsOptions: 'vers=4.2,noresvport,softerr',
  //     },
  //   }),
  // );

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
      K8S_Workstation_Apps_Longhorn_Stack.name,
      'Longhorn stack for workstation k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
