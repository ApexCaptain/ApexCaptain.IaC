import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Workstation_Apps_IngressController_Stack } from './ingress-controller.stack';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from '../../oke/apps/authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from '../../oke/apps/authentik.stack';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Workstation_Stack } from '@/terraform/stacks/cloudflare/record.workstation.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Application as AuthentikApplication } from '@lib/terraform/providers/authentik/application';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { ProviderProxy } from '@lib/terraform/providers/authentik/provider-proxy';
import { DataExternal } from '@lib/terraform/providers/external/data-external';
import { ExternalProvider } from '@lib/terraform/providers/external/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { StorageClassV1 } from '@lib/terraform/providers/kubernetes/storage-class-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

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
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      authentik: this.provide(
        AuthentikProvider,
        'authentikProvider',
        () =>
          this.k8sOkeAppsAuthentikStack.authentikProviderConfig.shared.config,
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        },
      })),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.longhorn,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  release = this.provide(Release, 'release', () => {
    const frontendServiceName = 'longhorn-frontend';

    return [
      {
        name: this.metadata.shared.helm.longhorn.name,
        chart: this.metadata.shared.helm.longhorn.chart,
        repository: this.metadata.shared.helm.longhorn.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        waitForJobs: true,
        values: [
          yaml.stringify({
            ingress: {
              enabled: true,
              ingressClassName:
                this.k8sWorkstationAppsIngressControllerStack.release.shared
                  .ingressClassName,
              host: this.cloudflareRecordWorkstationStack.longhornRecord.element
                .name,
              annotations: {
                'nginx.ingress.kubernetes.io/rewrite-target': '/',
                'nginx.ingress.kubernetes.io/auth-url':
                  this.k8sWorkstationAppsAuthentikStack
                    .workstationOutpostResource.shared.authUrl,
                'nginx.ingress.kubernetes.io/auth-signin': `https://${this.cloudflareRecordWorkstationStack.longhornRecord.element.name}${this.k8sWorkstationAppsAuthentikStack.workstationOutpostResource.shared.authSigninPostfix}`,

                'nginx.ingress.kubernetes.io/auth-response-headers': dedent`
                  Set-Cookie,X-authentik-username,X-authentik-groups,X-authentik-entitlements,X-authentik-email,X-authentik-name,X-authentik-uid
                `,
                'nginx.ingress.kubernetes.io/auth-snippet': dedent`
                  proxy_set_header X-Forwarded-Host $http_host;
                `,
                'nginx.ingress.kubernetes.io/whitelist-source-range': [
                  this.globalConfigService.config.terraform.externalIpCidrBlocks
                    .apexCaptainHomeIpv4,
                ].join(','),
                'nginx.ingress.kubernetes.io/configuration-snippet':
                  'satisfy any;',
              },
            },

            csi: {
              kubeletRootDir: '/var/snap/microk8s/common/var/lib/kubelet',
            },
            defaultSettings: {
              createDefaultDiskLabeledNodes: true,
              defaultReplicaCount: '1',
              /**
               * @Note
               *  - true: Allow to delete longhorn chart
               *  - false: Prevent to delete longhorn chart
               */
              deletingConfirmationFlag: false,
            },
            persistence: {
              defaultClass: false,
            },
          }),
        ],
      },
      { frontendServiceName },
    ];
  });

  longhornAuthentikProxyProvider = this.provide(
    ProviderProxy,
    'longhornAuthentikProxyProvider',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      mode: 'forward_single',
      internalHost: `http://${this.release.shared.frontendServiceName}.${this.namespace.element.metadata.name}.svc.cluster.local`,
      externalHost: `https://${this.cloudflareRecordWorkstationStack.longhornRecord.element.name}`,
      authorizationFlow:
        this.k8sOkeAppsAuthentikResourcesStack
          .dataDefaultProviderAuthorizationImplicitConsent.element.id,
      invalidationFlow:
        this.k8sOkeAppsAuthentikResourcesStack.dataDefaultInvalidationFlow
          .element.id,
    }),
  );

  longhornAuthentikApplication = this.provide(
    AuthentikApplication,
    'longhornAuthentikApplication',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      slug: _.kebabCase(`${this.metadata.shared.namespace}-${id}`),
      protocolProvider: Fn.tonumber(
        this.longhornAuthentikProxyProvider.element.id,
      ),
    }),
  );

  manageLonghornNodeExternal = this.provide(
    Resource,
    'manageLonghornNodeExternal',
    id => {
      const nodes = this.config.nodes.map((eachNodeInfo, index) => {
        const disks = Object.fromEntries(
          eachNodeInfo.disks.map<
            [
              string,
              {
                path: string;
                diskType: string;
                tags: string[];
              },
            ]
          >(({ name, path: diskPath, diskType, isSsd }) => [
            name,
            {
              path: diskPath,
              diskType,
              tags: isSsd ? ['ssd'] : ['hdd'],
            },
          ]),
        );

        const nodeStatus = this.provide(
          DataExternal,
          `${id}-${index}-node`,
          () => ({
            dependsOn: [this.release.element],
            program: [
              'bash',
              '-c',
              dedent`
                ts-node ${path.join(process.cwd(), 'scripts', 'external', 'manage-longhorn-node.external.ts')} \
                  --called-from-terraform \
                  --kubeconfig ${this.k8sWorkstationK8SStack.kubeConfigFile.element.filename} \
                  --namespace ${this.namespace.element.metadata.name} \
                  --node ${eachNodeInfo.name} \
                  --disks '${JSON.stringify(disks)}'
              `,
            ],
          }),
        );
        return nodeStatus;
      });
      return [{}, nodes];
    },
  );

  longhornSsdStorageClass = this.provide(
    StorageClassV1,
    'longhornSsdStorageClass',
    id => ({
      dependsOn: [this.release.element],
      metadata: {
        name: _.kebabCase(id),
        annotations: {
          'storageclass.kubernetes.io/is-default-class': true.toString(),
        },
      },
      storageProvisioner: 'driver.longhorn.io',
      allowVolumeExpansion: true,
      reclaimPolicy: 'Delete',
      parameters: {
        numberOfReplicas: '1',
        diskSelector: 'ssd',
        fsType: 'ext4',
        nfsOptions: 'vers=4.2,noresvport,softerr',
      },
    }),
  );

  longhornHddStorageClass = this.provide(
    StorageClassV1,
    'longhornHddStorageClass',
    id => ({
      dependsOn: [this.release.element],
      metadata: {
        name: _.kebabCase(id),
      },
      storageProvisioner: 'driver.longhorn.io',
      allowVolumeExpansion: true,
      reclaimPolicy: 'Delete',
      parameters: {
        numberOfReplicas: '1',
        diskSelector: 'hdd',
        fsType: 'ext4',
        nfsOptions: 'vers=4.2,noresvport,softerr',
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
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly cloudflareRecordWorkstationStack: Cloudflare_Record_Workstation_Stack,
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
    private readonly k8sWorkstationAppsAuthentikStack: K8S_Workstation_Apps_Authentik_Stack,
    private readonly k8sWorkstationAppsIngressControllerStack: K8S_Workstation_Apps_IngressController_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Longhorn_Stack.name,
      'Longhorn stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsIngressControllerStack);
  }
}
