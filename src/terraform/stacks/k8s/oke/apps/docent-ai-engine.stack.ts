import { AbstractStack, createOciPolicyStatement } from '@/common';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { Fn, LocalBackend } from 'cdktf';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { K8S_Oke_Compartment_Stack } from '../compartment.stack';
import _ from 'lodash';
import { ArtifactsContainerRepository } from '@lib/terraform/providers/oci/artifacts-container-repository';
import { Project_Stack } from '@/terraform/stacks/project.stack';
import { IdentityGroup } from '@lib/terraform/providers/oci/identity-group';
import { IdentityUser } from '@lib/terraform/providers/oci/identity-user';
import { IdentityUserGroupMembership } from '@lib/terraform/providers/oci/identity-user-group-membership';
import { IdentityUserCapabilitiesManagement } from '@lib/terraform/providers/oci/identity-user-capabilities-management';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { IdentityApiKey } from '@lib/terraform/providers/oci/identity-api-key';
import { IdentityAuthToken } from '@lib/terraform/providers/oci/identity-auth-token';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { IdentityPolicy } from '@lib/terraform/providers/oci/identity-policy';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';

@Injectable()
export class K8S_Oke_Apps_DocentAiEngine_Stack extends AbstractStack {
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
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
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

  containerRegistry = this.provide(
    ArtifactsContainerRepository,
    'containerRegistry',
    () => {
      const displayName = this.metadata.shared.services.docentAiEngine.name;
      return [
        {
          compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
          displayName,
          isPublic: false,
        },
        {
          accessUrl: `${this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0).regionName}.ocir.io/${this.projectStack.dataOciObjectstorageNamespace.element.namespace}/${displayName}`,
        },
      ];
    },
  );

  applier = this.provide(Resource, 'applier', idPrefix => {
    const applicationName = this.metadata.shared.services.docentAiEngine.name;
    const group = this.provide(
      IdentityGroup,
      `${applicationName}-${idPrefix}-group`,
      id => ({
        compartmentId: this.projectStack.dataRootOciTenancy.element.id,
        description: `Group for ${applicationName} ${idPrefix}`,
        name: id,
      }),
    );

    const user = this.provide(
      IdentityUser,
      `${applicationName}-${idPrefix}-user`,
      id => ({
        compartmentId: this.projectStack.dataRootOciTenancy.element.id,
        description: `User for ${applicationName} ${idPrefix}`,
        name: id,
      }),
    );

    this.provide(
      IdentityUserGroupMembership,
      `${applicationName}-${idPrefix}-userGroupMembership`,
      () => ({
        groupId: group.element.id,
        userId: user.element.id,
      }),
    );

    const authToken = this.provide(
      IdentityAuthToken,
      `${applicationName}-${idPrefix}-authToken`,
      () => ({
        description: `${applicationName} ${idPrefix} auth token`,
        userId: user.element.id,
      }),
    );

    this.provide(
      IdentityPolicy,
      `${applicationName}-${idPrefix}-policy`,
      id => ({
        compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
        description: `Policy for ${applicationName} ${idPrefix}`,
        name: id,
        statements: [
          createOciPolicyStatement({
            subject: {
              type: 'group',
              targets: [group.element.name],
            },
            verb: 'read',
            resourceType: 'repos',
            location: {
              type: 'compartment',
              expression:
                this.k8sOkeCompartmentStack.okeCompartment.element.name,
            },
            // condition
          }),
        ],
      }),
    );

    return [
      {},
      {
        user,
        authToken,
      },
    ];
  });

  developer = this.provide(Resource, 'developer', idPrefix => {
    const applicationName = this.metadata.shared.services.docentAiEngine.name;
    const group = this.provide(
      IdentityGroup,
      `${applicationName}-${idPrefix}-group`,
      id => ({
        compartmentId: this.projectStack.dataRootOciTenancy.element.id,
        description: `Group for ${applicationName} ${idPrefix}`,
        name: id,
      }),
    );

    const user = this.provide(
      IdentityUser,
      `${applicationName}-${idPrefix}-user`,
      id => ({
        compartmentId: this.projectStack.dataRootOciTenancy.element.id,
        description: `User for ${applicationName} ${idPrefix}`,
        name: id,
      }),
    );

    this.provide(
      IdentityUserGroupMembership,
      `${applicationName}-${idPrefix}-userGroupMembership`,
      () => ({
        groupId: group.element.id,
        userId: user.element.id,
      }),
    );
    this.provide(
      IdentityUserCapabilitiesManagement,
      `${applicationName}-${idPrefix}-userCapabilitiesManagement`,
      () => ({
        userId: user.element.id,
        // Caps
        canUseApiKeys: true,
        canUseAuthTokens: true,
        canUseConsolePassword: false,
        canUseCustomerSecretKeys: false,
        canUseSmtpCredentials: false,
      }),
    );

    const authToken = this.provide(
      IdentityAuthToken,
      `${applicationName}-${idPrefix}-authToken`,
      () => ({
        description: `${applicationName} ${idPrefix} auth token`,
        userId: user.element.id,
      }),
    );

    const privateKey = this.provide(
      PrivateKey,
      `${applicationName}-${idPrefix}-privateKey`,
      () => ({
        algorithm: 'RSA',
        rsaBits: 4096,
      }),
    );

    const apiKey = this.provide(IdentityApiKey, `${idPrefix}-apiKey`, () => ({
      userId: user.element.id,
      keyValue: privateKey.element.publicKeyPem,
    }));

    this.provide(
      IdentityPolicy,
      `${applicationName}-${idPrefix}-policy`,
      id => ({
        compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
        description: `Policy for ${applicationName} ${idPrefix}`,
        name: id,
        statements: [
          createOciPolicyStatement({
            subject: {
              type: 'group',
              targets: [group.element.name],
            },
            verb: 'manage',
            resourceType: 'repos',
            location: {
              type: 'compartment',
              expression:
                this.k8sOkeCompartmentStack.okeCompartment.element.name,
            },
            // condition
          }),
        ],
      }),
    );

    return [{}, { user, authToken, privateKey, apiKey }];
  });

  readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.docentAiEngine,
  ]);

  // k8s

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  service = this.provide(ServiceV1, 'service', () => [
    {
      metadata: {
        name: this.metadata.shared.services.docentAiEngine.name,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        selector: this.metadata.shared.services.docentAiEngine.labels,
        port: Object.values(this.metadata.shared.services.docentAiEngine.ports),
      },
    },
    {
      ports: this.metadata.shared.services.docentAiEngine.ports,
    },
  ]);

  imagePullSecret = this.provide(SecretV1, 'imagePullSecret', id => {
    const server = `${this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0).regionName}.ocir.io`;
    const username = `${this.projectStack.dataOciObjectstorageNamespace.element.namespace}/${this.applier.shared.user.element.name}`;
    const password = this.applier.shared.authToken.element.token;
    const auth = Fn.base64encode(`${username}:${password}`);

    return {
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      type: 'kubernetes.io/dockerconfigjson',
      data: {
        '.dockerconfigjson': JSON.stringify({
          auths: {
            [server]: {
              username,
              password,
              auth,
            },
          },
        }),
      },
    };
  });

  deployment = this.provide(DeploymentV1, 'deployment', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      replicas: '1',
      selector: {
        matchLabels: this.metadata.shared.services.docentAiEngine.labels,
      },

      template: {
        metadata: {
          labels: this.metadata.shared.services.docentAiEngine.labels,
        },

        spec: {
          imagePullSecrets: [
            {
              name: this.imagePullSecret.element.metadata.name,
            },
          ],
          container: [
            {
              name: this.metadata.shared.services.docentAiEngine.name,
              image: `${this.containerRegistry.shared.accessUrl}:latest`,
              imagePullPolicy: 'Always',
              ports: Object.values(
                this.metadata.shared.services.docentAiEngine.ports,
              ).map<DeploymentV1SpecTemplateSpecContainerPort>(eachPort => ({
                containerPort: parseInt(eachPort.targetPort),
                protocol: eachPort.protocol,
              })),
              env: [
                {
                  name: 'NODE_ENV',
                  value: 'production',
                },
              ],
            },
          ],
        },
      },
    },
    lifecycle: {
      ignoreChanges: [
        'spec[0].template[0].metadata[0].annotations["kubectl.kubernetes.io/restartedAt"]',
      ],
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_DocentAiEngine_Stack.name,
      'Docent AI Engine for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsIstioStack);
  }
}
