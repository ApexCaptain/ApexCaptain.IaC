import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import _ from 'lodash';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import {
  Cloudflare_Zone_Stack,
  Cloudflare_Record_Stack,
} from '@/terraform/stacks/cloudflare';
import { PersistentVolumeV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-v1';

@Injectable()
export class K8S_Oke_Apps_FileBrowser_Stack extends AbstractStack {
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
    this.k8sOkeSystemStack.applicationMetadata.shared.fileBrowser,
  ]);

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.metadata.shared.namespace,
  //   },
  // }));

  // service = this.provide(ServiceV1, 'service', () => ({
  //   metadata: {
  //     name: this.metadata.shared.services.fileBrowser.name,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     selector: this.metadata.shared.services.fileBrowser.labels,
  //     port: Object.values(this.metadata.shared.services.fileBrowser.ports),
  //   },
  // }));

  // persistentVolume = this.provide(
  //   PersistentVolumeV1,
  //   'persistentVolume',
  //   id => ({
  //     metadata: {
  //       name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     },
  //     spec: this.k8sOkeSystemStack.applicationPersistentVolumeMetadata.shared,
  //   }),
  // );

  // persistentVolumeClaim = this.provide(
  //   PersistentVolumeClaimV1,
  //   'persistentVolumeClaim',
  //   id => {
  //     return [
  //       {
  //         metadata: {
  //           name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //           namespace: this.namespace.element.metadata.name,
  //         },
  //         spec: {
  //           accessModes: ['ReadWriteMany'],
  //           resources: {
  //             requests: {
  //               storage: '20Gi',
  //             },
  //           },
  //           storageClassName: '',
  //           volumeName: this.persistentVolume.element.metadata.name,
  //         },
  //       },
  //       {
  //         database: {
  //           volumeDirPath: 'file-browser/database',
  //           podDirPath: '/database',
  //           podFilePath: '/database/database.db',
  //         },
  //       },
  //     ];
  //   },
  // );

  // // https: //github.com/jacksgt/homelab/blob/8a277a6f37211d6d258575f5d63b2b6fdc987c2e/flux/apps/bases/jellyfin/filebrowser.yaml#L31-L33
  // deployment = this.provide(DeploymentV1, 'deployment', id => ({
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     replicas: '1',
  //     selector: {
  //       matchLabels: this.metadata.shared.services.fileBrowser.labels,
  //     },
  //     template: {
  //       metadata: {
  //         labels: this.metadata.shared.services.fileBrowser.labels,
  //       },
  //       spec: {
  //         container: [
  //           {
  //             name: this.metadata.shared.services.fileBrowser.name,
  //             image: 'filebrowser/filebrowser',
  //             imagePullPolicy: 'Always',
  //             ports: Object.values(
  //               this.metadata.shared.services.fileBrowser.ports,
  //             ).map<DeploymentV1SpecTemplateSpecContainerPort>(eachPort => ({
  //               containerPort: parseInt(eachPort.targetPort),
  //               protocol: eachPort.protocol,
  //             })),
  //             volumeMount: [
  //               {
  //                 name: this.persistentVolumeClaim.element.metadata.name,
  //                 mountPath:
  //                   this.persistentVolumeClaim.shared.database.podDirPath,
  //                 subPath:
  //                   this.persistentVolumeClaim.shared.database.volumeDirPath,
  //               },
  //             ],
  //             env: [
  //               {
  //                 name: 'FB_NOAUTH',
  //                 value: 'true',
  //               },
  //               {
  //                 name: 'FB_DATABASE',
  //                 value: this.persistentVolumeClaim.shared.database.podFilePath,
  //               },
  //             ],
  //           },
  //         ],
  //         volume: [
  //           {
  //             name: this.persistentVolumeClaim.element.metadata.name,
  //             persistentVolumeClaim: {
  //               claimName: this.persistentVolumeClaim.element.metadata.name,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   },
  // }));

  // ingress = this.provide(IngressV1, 'ingress', id => ({
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //     annotations: {
  //       'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
  //       'nginx.ingress.kubernetes.io/rewrite-target': '/',
  //       'kubernetes.io/ingress.class': 'nginx',
  //       'nginx.ingress.kubernetes.io/auth-url':
  //         this.k8sOkeAppsOAuth2ProxyStack.release.shared.authUrl,
  //       'nginx.ingress.kubernetes.io/auth-signin':
  //         this.k8sOkeAppsOAuth2ProxyStack.release.shared.authSignin,
  //     },
  //   },
  //   spec: {
  //     ingressClassName: 'nginx',
  //     rule: [
  //       {
  //         host: `${this.cloudflareRecordStack.fileBrowserRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
  //         http: {
  //           path: [
  //             {
  //               path: '/',
  //               pathType: 'Prefix',
  //               backend: {
  //                 service: {
  //                   name: this.service.element.metadata.name,
  //                   port: {
  //                     number:
  //                       this.metadata.shared.services.fileBrowser.ports[
  //                         'file-browser'
  //                       ].port,
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
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_FileBrowser_Stack.name,
      'File Browser stack for oke k8s',
    );
    this.addDependency(this.k8sOkeSystemStack);
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
