import { AbstractStack, createOciPolicyStatement } from '@/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { K8S_Oke_Compartment_Stack } from '../compartment.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { Project_Stack } from '@/terraform/stacks/project.stack';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { ArtifactsContainerRepository } from '@lib/terraform/providers/oci/artifacts-container-repository';
import { IdentityGroup } from '@lib/terraform/providers/oci/identity-group';
import { IdentityUser } from '@lib/terraform/providers/oci/identity-user';
import { IdentityAuthToken } from '@lib/terraform/providers/oci/identity-auth-token';
import { IdentityUserGroupMembership } from '@lib/terraform/providers/oci/identity-user-group-membership';
import { IdentityPolicy } from '@lib/terraform/providers/oci/identity-policy';
import { IdentityUserCapabilitiesManagement } from '@lib/terraform/providers/oci/identity-user-capabilities-management';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { IdentityApiKey } from '@lib/terraform/providers/oci/identity-api-key';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import _ from 'lodash';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { K8S_Oke_Apps_DocentAiEngine_Stack } from './docent-ai-engine.stack';
import dedent from 'dedent';

@Injectable()
export class K8S_Oke_Apps_DocentAiWeb_Stack extends AbstractStack {
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
      const displayName = this.metadata.shared.services.docentAiWeb.name;
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
    const applicationName = this.metadata.shared.services.docentAiWeb.name;
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
    const applicationName = this.metadata.shared.services.docentAiWeb.name;
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

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.docentAiWeb,
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

  service = this.provide(ServiceV1, 'service', () => ({
    metadata: {
      name: this.metadata.shared.services.docentAiWeb.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.docentAiWeb.labels,
      port: Object.values(this.metadata.shared.services.docentAiWeb.ports),
    },
  }));

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
        matchLabels: this.metadata.shared.services.docentAiWeb.labels,
      },
      template: {
        metadata: {
          labels: this.metadata.shared.services.docentAiWeb.labels,
        },

        spec: {
          imagePullSecrets: [
            {
              name: this.imagePullSecret.element.metadata.name,
            },
          ],
          container: [
            {
              name: this.metadata.shared.services.docentAiWeb.name,
              image: `${this.containerRegistry.shared.accessUrl}:latest`,
              imagePullPolicy: 'Always',
              ports: Object.values(
                this.metadata.shared.services.docentAiWeb.ports,
              ).map<DeploymentV1SpecTemplateSpecContainerPort>(eachPort => ({
                containerPort: parseInt(eachPort.targetPort),
                protocol: eachPort.protocol,
              })),
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

  ingress = this.provide(IngressV1, 'ingress', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'nginx.ingress.kubernetes.io/server-snippet': dedent`
            location /api/ {
              proxy_pass http://${this.k8sOkeAppsDocentAiEngineStack.service.element.metadata.name}.${this.k8sOkeAppsDocentAiEngineStack.namespace.element.metadata.name}.svc.cluster.local:${this.k8sOkeAppsDocentAiEngineStack.metadata.shared.services.docentAiEngine.ports.docentAiEngine.port}/api/;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            }
        `,
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.docentRecord.element.name}`,
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
                        this.metadata.shared.services.docentAiWeb.ports
                          .docentAiWeb.port,
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

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
    private readonly k8sOkeAppsDocentAiEngineStack: K8S_Oke_Apps_DocentAiEngine_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_DocentAiWeb_Stack.name,
      'Docent AI Web for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsIstioStack);
  }
}
