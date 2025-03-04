import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { AbstractStack, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { ServiceAccountV1 } from '@lib/terraform/providers/kubernetes/service-account-v1';
import { ClusterRoleBindingV1 } from '@lib/terraform/providers/kubernetes/cluster-role-binding-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { Password } from '@lib/terraform/providers/random/password';
import { StringResource } from '@lib/terraform/providers/random/string-resource';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { TimeProvider } from '@lib/terraform/providers/time/provider';

@Injectable()
export class K8S_Workstation_Apps_Dashboard_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  meta = {
    name: 'dashboard',
  };

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  service = this.provide(ServiceV1, 'service', id => [
    {
      metadata: {
        name: _.kebabCase(`${this.meta.name}-${id}`),
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        type: 'ExternalName',
        externalName: `${
          this.k8sWorkstationSystemStack.dataKubernetesDashboardService.element
            .metadata.name
        }.${this.k8sWorkstationSystemStack.dataNamespace.element.metadata.name}.svc.cluster.local`,
      },
    },
    {
      servicePort:
        this.k8sWorkstationSystemStack.dataKubernetesDashboardService.shared
          .servicePort,
    },
  ]);

  serviceAccount = this.provide(ServiceAccountV1, 'serviceAccount', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
    },
  }));

  serviceAccountTokenExpiration = this.provide(
    StaticResource,
    'serviceAccountTokenExpiration',
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          days: 30,
        }).toString(),
      },
    }),
  );

  serviceAccountToken = this.provide(SecretV1, 'serviceAccountToken', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'kubernetes.io/service-account.name':
          this.serviceAccount.element.metadata.name,
      },
    },
    type: 'kubernetes.io/service-account-token',
    lifecycle: {
      replaceTriggeredBy: [
        `${this.serviceAccountTokenExpiration.element.terraformResourceType}.${this.serviceAccountTokenExpiration.element.friendlyUniqueId}`,
      ],
    },
  }));

  clusterRoleBinding = this.provide(
    ClusterRoleBindingV1,
    'clusterRoleBinding',
    id => ({
      metadata: {
        name: _.kebabCase(`${this.meta.name}-${id}`),
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: 'cluster-admin',
      },
      subject: [
        {
          kind: 'ServiceAccount',
          name: this.serviceAccount.element.metadata.name,
          namespace: this.namespace.element.metadata.name,
        },
      ],
    }),
  );

  ingressBasicAuthUsername = this.provide(
    StringResource,
    'ingressBasicAuthUsername',
    () => ({
      length: 16,
      special: false,
      keepers: {
        expirationDate: createExpirationInterval({
          days: 30,
        }).toString(),
      },
    }),
  );

  ingressBasicAuthPassword = this.provide(
    Password,
    'ingressBasicAuthPassword',
    () => ({
      length: 16,
      keepers: {
        expirationDate: createExpirationInterval({
          days: 30,
        }).toString(),
      },
    }),
  );

  ingressBasicAuthSecret = this.provide(
    SecretV1,
    'ingressBasicAuthSecret',
    id => ({
      metadata: {
        name: _.kebabCase(`${this.meta.name}-${id}`),
        namespace: this.namespace.element.metadata.name,
      },
      data: {
        auth: `${this.ingressBasicAuthUsername.element.result}:${this.ingressBasicAuthPassword.element.bcryptHash}`,
      },
      type: 'Opaque',
    }),
  );

  authenticationInfo = this.provide(
    SensitiveFile,
    'authenticationInfo',
    id => ({
      filename: path.join(
        process.cwd(),
        this.globalConfigService.config.terraform.stacks.common
          .generatedKeyFilesDirPaths.relativeSecretsDirPath,
        `${K8S_Workstation_Apps_Dashboard_Stack.name}-${id}.json`,
      ),
      content: JSON.stringify(
        {
          dashboardAuthenticationToken: Fn.lookup(
            this.serviceAccountToken.element.data,
            'token',
          ),
          basicAuth: {
            username: this.ingressBasicAuthUsername.element.result,
            password: this.ingressBasicAuthPassword.element.result,
          },
        },
        null,
        2,
      ),
    }),
  );

  ingress = this.provide(IngressV1, 'ingress', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'kubernetes.io/ingress.class': 'nginx',
        'nginx.ingress.kubernetes.io/auth-type': 'basic',
        'nginx.ingress.kubernetes.io/auth-secret':
          this.ingressBasicAuthSecret.element.metadata.name,
        'nginx.ingress.kubernetes.io/auth-realm': 'Authentication Required',
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.workstationDashboardRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.service.element.metadata.name,
                    port: {
                      number: this.service.shared.servicePort,
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
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Dashboard_Stack.name,
      'Dashboard stack for workstation k8s',
    );
  }
}
