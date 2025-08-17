import { TerraformAppService } from '@/terraform/terraform.app.service';
import { Project_Stack } from '@/terraform/stacks/project.stack';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AbstractStack, createOciPolicyStatement } from '@/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import yaml from 'yaml';
import { K8S_Oke_Compartment_Stack } from '../compartment.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { IdentityGroup } from '@lib/terraform/providers/oci/identity-group';
import { IdentityUser } from '@lib/terraform/providers/oci/identity-user';
import { IdentityAuthToken } from '@lib/terraform/providers/oci/identity-auth-token';
import { IdentityPolicy } from '@lib/terraform/providers/oci/identity-policy';
import { IdentityUserGroupMembership } from '@lib/terraform/providers/oci/identity-user-group-membership';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { Construct } from 'constructs';

@Injectable()
export class K8S_Oke_Apps_ArgoCd_Stack extends AbstractStack {
  // static get crds() {
  //   type ApplicationConfig = {
  //     metadata: {
  //       name: string;
  //       namespace: string;
  //       annotations: { [key: string]: string };
  //     };
  //     spec: {
  //       project: string;
  //       destination: {
  //         namespace: string;
  //         server: string;
  //       };
  //     };
  //   };
  //   class Application extends Manifest {
  //     constructor(scope: Construct, id: string, props: ApplicationConfig) {
  //       super(scope, id, {
  //         manifest: {
  //           apiVersion: 'argoproj.io/v1alpha1',
  //           kind: 'Application',
  //           ...props,
  //         },
  //       });
  //     }
  //   }

  //   const crds = {
  //     Application,
  //   };
  //   return crds;
  // }

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
    },
  };

  // apexCaptainOcirApplier = this.provide(
  //   Resource,
  //   'apexCaptainOcirApplier',
  //   idPrefix => {
  //     const applicationName = this.metadata.shared.namespace;
  //     const group = this.provide(
  //       IdentityGroup,
  //       `${applicationName}-${idPrefix}-group`,
  //       id => ({
  //         compartmentId: this.projectStack.dataRootOciTenancy.element.id,
  //         description: `Group for ${applicationName} ${idPrefix}`,
  //         name: id,
  //       }),
  //     );

  //     const user = this.provide(
  //       IdentityUser,
  //       `${applicationName}-${idPrefix}-user`,
  //       id => ({
  //         compartmentId: this.projectStack.dataRootOciTenancy.element.id,
  //         description: `User for ${applicationName} ${idPrefix}`,
  //         name: id,
  //       }),
  //     );

  //     this.provide(
  //       IdentityUserGroupMembership,
  //       `${applicationName}-${idPrefix}-userGroupMembership`,
  //       () => ({
  //         groupId: group.element.id,
  //         userId: user.element.id,
  //       }),
  //     );

  //     const authToken = this.provide(
  //       IdentityAuthToken,
  //       `${applicationName}-${idPrefix}-authToken`,
  //       () => ({
  //         description: `${applicationName} ${idPrefix} auth token`,
  //         userId: user.element.id,
  //       }),
  //     );

  //     this.provide(
  //       IdentityPolicy,
  //       `${applicationName}-${idPrefix}-policy`,
  //       id => ({
  //         compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
  //         description: `Policy for ${applicationName} ${idPrefix}`,
  //         name: id,
  //         statements: [
  //           createOciPolicyStatement({
  //             subject: {
  //               type: 'group',
  //               targets: [group.element.name],
  //             },
  //             verb: 'read',
  //             resourceType: 'repos',
  //             location: {
  //               type: 'compartment',
  //               expression:
  //                 this.k8sOkeCompartmentStack.okeCompartment.element.name,
  //             },
  //           }),
  //         ],
  //       }),
  //     );

  //     return [
  //       {},
  //       {
  //         user,
  //         authToken,
  //       },
  //     ];
  //   },
  // );

  // metadata = this.provide(Resource, 'metadata', () => [
  //   {},
  //   this.k8sOkeSystemStack.applicationMetadata.shared.argoCd,
  // ]);

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.metadata.shared.namespace,
  //   },
  // }));

  // apexCaptainOcirImagePullSecret = this.provide(
  //   SecretV1,
  //   'apexCaptainOcirImagePullSecret',
  //   id => {
  //     const server = `${this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0).regionName}.ocir.io`;
  //     const username = `${this.projectStack.dataOciObjectstorageNamespace.element.namespace}/${this.apexCaptainOcirApplier.shared.user.element.name}`;
  //     const password =
  //       this.apexCaptainOcirApplier.shared.authToken.element.token;
  //     const auth = Fn.base64encode(`${username}:${password}`);

  //     return [
  //       {
  //         metadata: {
  //           name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //           namespace: this.namespace.element.metadata.name,
  //         },
  //         type: 'kubernetes.io/dockerconfigjson',
  //         data: {
  //           '.dockerconfigjson': JSON.stringify({
  //             auths: {
  //               [server]: {
  //                 username,
  //                 password,
  //                 auth,
  //               },
  //             },
  //           }),
  //         },
  //       },
  //       {
  //         apiUrl: `https://${server}`,
  //         prefix: server,
  //       },
  //     ];
  //   },
  // );

  // argoCdRelease = this.provide(Release, 'argoCdRelease', () => {
  //   return {
  //     name: this.metadata.shared.helm.argoCd.name,
  //     chart: this.metadata.shared.helm.argoCd.chart,
  //     repository: this.metadata.shared.helm.argoCd.repository,
  //     namespace: this.namespace.element.metadata.name,
  //     createNamespace: false,
  //     values: [
  //       yaml.stringify({
  //         global: {
  //           domain: `${this.cloudflareRecordStack.argoCdRecord.element.name}`,
  //         },
  //         server: {
  //           ingress: {
  //             enabled: true,
  //             controller: 'generic',
  //             annotations: {
  //               'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
  //               'nginx.ingress.kubernetes.io/rewrite-target': '/',
  //               'nginx.ingress.kubernetes.io/auth-url':
  //                 this.k8sOkeAppsOAuth2ProxyStack.release.shared.authUrl,
  //               'nginx.ingress.kubernetes.io/auth-signin':
  //                 this.k8sOkeAppsOAuth2ProxyStack.release.shared.authSignin,
  //             },
  //             ingressClassName: 'nginx',
  //           },
  //         },
  //         configs: {
  //           params: {
  //             'server.insecure': true,
  //             /**
  //              * @note
  //              * - OAuth2 Proxy로 이미 막고 있고 혼자 쓰는 거라 일단 열어둠
  //              * - 나중에 다른 사람들이 쓸 일 생기면 이 부분 꼭 닫아야 함
  //              */
  //             'server.disable.auth': true,
  //           },
  //         },
  //       }),
  //     ],
  //   };
  // });

  // argoCdImageUpdaterRelease = this.provide(
  //   Release,
  //   'argoCdImageUpdaterRelease',
  //   () => ({
  //     dependsOn: [this.argoCdRelease.element],
  //     name: this.metadata.shared.helm.argoCdImageUpdater.name,
  //     chart: this.metadata.shared.helm.argoCdImageUpdater.chart,
  //     repository: this.metadata.shared.helm.argoCdImageUpdater.repository,
  //     namespace: this.namespace.element.metadata.name,
  //     createNamespace: false,
  //     values: [
  //       yaml.stringify({
  //         config: {
  //           registries: [
  //             {
  //               name: this.apexCaptainOcirImagePullSecret.element.metadata.name,
  //               api_url: this.apexCaptainOcirImagePullSecret.shared.apiUrl,
  //               prefix: this.apexCaptainOcirImagePullSecret.shared.prefix,
  //               ping: 'yes',
  //               credentials: `pullsecret:${this.namespace.element.metadata.name}/${this.apexCaptainOcirImagePullSecret.element.metadata.name}`,
  //             },
  //           ],
  //         },
  //       }),
  //     ],
  //   }),
  // );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ArgoCd_Stack.name,
      'Argo CD for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsNfsStack);
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
