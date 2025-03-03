import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { AbstractStack, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataKubernetesSecret } from '@lib/terraform/providers/kubernetes/data-kubernetes-secret';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { Secret } from '@lib/terraform/providers/kubernetes/secret';
import { Password } from '@lib/terraform/providers/random/password';
import { StringResource } from '@lib/terraform/providers/random/string-resource';
import { Service } from '@lib/terraform/providers/kubernetes/service';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';

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
    },
  };

  meta = {
    name: 'dashboard',
  };

  namespace = this.provide(Namespace, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  service = this.provide(Service, 'service', id => [
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

  dataDashboardTokenSecret = this.provide(
    DataKubernetesSecret,
    'dataDashboardTokenSecret',
    () => ({
      metadata: {
        name: this.k8sWorkstationSystemStack.dataKubernetesDashboardService
          .shared.tokenSecretName,
        namespace:
          this.k8sWorkstationSystemStack.dataNamespace.element.metadata.name,
      },
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
    Secret,
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
          dashboardAuthenticationToken:
            this.dataDashboardTokenSecret.element.data.lookup('token'),
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
