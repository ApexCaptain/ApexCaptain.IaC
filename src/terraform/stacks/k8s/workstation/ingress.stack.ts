import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Meta_Stack } from './meta.stack';
import { K8S_Workstation_Service_Stack } from './service.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Ingress_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  utilityIngress = this.provide(IngressV1, 'utilityIngress', id => ({
    metadata: {
      name: _.kebabCase(id),
      namespace: this.k8sWorkstationMetaStack.meta.shared.cloudbeaver.namespace,
      annotations: {
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'kubernetes.io/ingress.class': 'nginx',
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: this.globalConfigService.config.terraform.stacks.k8s.workstation
            .meta.workstationDomain,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.k8sWorkstationServiceStack.services.shared
                      .cloudbeaver.element.metadata.name,
                    port: {
                      number:
                        this.k8sWorkstationMetaStack.meta.shared.cloudbeaver
                          .port.workspace.servicePort,
                    },
                  },
                },
              },
            ],
          },
        },
        {
          host: this.globalConfigService.config.terraform.stacks.k8s.workstation
            .meta.workstationDomain,
          http: {
            path: [
              {
                path: '/sftp',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.k8sWorkstationServiceStack.services.shared.sftp
                      .element.metadata.name,
                    port: {
                      number:
                        this.k8sWorkstationMetaStack.meta.shared.sftp.port.sftp
                          .servicePort,
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
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    // Global
    private readonly globalConfigService: GlobalConfigService,
    // Stacks
    private readonly k8sWorkstationMetaStack: K8S_Workstation_Meta_Stack,
    private readonly k8sWorkstationServiceStack: K8S_Workstation_Service_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Ingress_Stack.name,
      'Ingress stack for Workstation k8s',
    );
  }
}
