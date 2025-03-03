import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { AbstractStack, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Secret } from '@lib/terraform/providers/kubernetes/secret';
import { Service } from '@lib/terraform/providers/kubernetes/service';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { Password } from '@lib/terraform/providers/random/password';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';

@Injectable()
export class K8S_Workstation_Apps_RedisInsight_Stack extends AbstractStack {
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
    name: 'redis-insight',
    labels: {
      app: 'redis-insight',
    },
    port: {
      workspace: {
        containerPort: 5540,
        servicePort: 5540,
      },
    },
    volume: {
      workspace: {
        containerDirPath: '/data',
        hostDirPath: path.join(
          this.globalConfigService.config.terraform.stacks.k8s.workstation
            .common.volumeDirPath.ssdVolume,
          'redis-insight-data',
        ),
        volumeName: 'redis-insight-data',
      },
    },
  };

  namespace = this.provide(Namespace, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  deployment = this.provide(Deployment, 'deployment', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      replicas: '1',
      selector: {
        matchLabels: this.meta.labels,
      },
      template: {
        metadata: {
          labels: this.meta.labels,
        },
        spec: {
          container: [
            {
              name: 'redis-insight',
              image: 'redislabs/redisinsight:latest',
              imagePullPolicy: 'Always',
              port: [
                {
                  containerPort: this.meta.port.workspace.containerPort,
                },
              ],
              livenessProbe: {
                httpGet: {
                  path: '/',
                  port: this.meta.port.workspace.containerPort.toString(),
                },
                initialDelaySeconds: 300,
                periodSeconds: 300,
                timeoutSeconds: 10,
              },
              volumeMount: [
                {
                  name: this.meta.volume.workspace.volumeName,
                  mountPath: this.meta.volume.workspace.containerDirPath,
                },
              ],
            },
          ],
          volume: [
            {
              name: this.meta.volume.workspace.volumeName,
              hostPath: {
                type: 'DirectoryOrCreate',
                path: this.meta.volume.workspace.hostDirPath,
              },
            },
          ],
        },
      },
    },
  }));

  service = this.provide(Service, 'service', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      type: 'ClusterIP',
      selector: this.meta.labels,
      port: Object.values(this.meta.port).map(port => ({
        port: port.servicePort,
        targetPort: port.containerPort.toString(),
      })),
    },
  }));

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
        `${K8S_Workstation_Apps_RedisInsight_Stack.name}-${id}.json`,
      ),
      content: JSON.stringify(
        {
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
          host: `${this.cloudflareRecordStack.redisInsightDnsRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.service.element.metadata.name,
                    port: {
                      number: this.meta.port.workspace.servicePort,
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
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_RedisInsight_Stack.name,
      'RedisInsight stack for workstation k8s',
    );
  }
}
