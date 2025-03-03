import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import {
  Cloudflare_Record_Stack,
  Cloudflare_Zone_Stack,
} from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Service } from '@lib/terraform/providers/kubernetes/service';

@Injectable()
export class K8S_Workstation_Apps_Cloudbeaver_Stack extends AbstractStack {
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
    },
  };

  meta = {
    name: 'cloudbeaver',
    labels: {
      app: 'cloudbeaver',
    },
    port: {
      workspace: {
        containerPort: 8978,
        servicePort: 8978,
      },
    },
    volume: {
      workspace: {
        containerDirPath: '/opt/cloudbeaver/workspace',
        hostDirPath: path.join(
          this.globalConfigService.config.terraform.stacks.k8s.workstation
            .common.volumeDirPath.ssdVolume,
          'cloudbeaver-workspace',
        ),
        volumeName: 'cloudbeaver-workspace',
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
              name: 'cloudbeaver',
              // @Note: This is not the latest version of CloudBeaver but
              // it is the latest version that is compatible with current k8s cluster. idk why.
              image: 'dbeaver/cloudbeaver:24.2.0',
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

  ingress = this.provide(IngressV1, 'ingress', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'kubernetes.io/ingress.class': 'nginx',
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.cloudbeaverDnsRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
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
      K8S_Workstation_Apps_Cloudbeaver_Stack.name,
      'Cloudbeaver stack for workstation k8s',
    );
  }
}
