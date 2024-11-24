import { readFileSync } from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_CloudbeaverApp_Stack } from './cloudbeaver-app.stack';
import { K8S_Workstation_Helm_Stack } from './helm.stack';
import { K8S_Workstation_Namespace_Stack } from './namespace.stack';
import { K8S_Workstation_SftpApp_Stack } from './sftp-app.stack';
import { Cloudflare_Record_Stack } from '../../cloudflare/record.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Secret } from '@lib/terraform/providers/kubernetes/secret';

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
      namespace:
        this.k8sWorkstationNamespaceStack.utilityNamespace.element.metadata
          .name,
      annotations: {
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'kubernetes.io/ingress.class': 'nginx',
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: this.cloudflareRecordStack.cloudbeaverRecord.element.hostname,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.k8sWorkstationCloudbeaverAppStack
                      .cloudbeaverService.element.metadata.name,
                    port: {
                      number:
                        this.k8sWorkstationCloudbeaverAppStack.meta.port
                          .workspace.servicePort,
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
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    // Global
    private readonly globalConfigService: GlobalConfigService,
    // Stack
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sWorkstationNamespaceStack: K8S_Workstation_Namespace_Stack,
    private readonly k8sWorkstationCloudbeaverAppStack: K8S_Workstation_CloudbeaverApp_Stack,
    private readonly k8sWorkstationSftpAppStack: K8S_Workstation_SftpApp_Stack,
    private readonly k8sWorkstationHelmStack: K8S_Workstation_Helm_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Ingress_Stack.name,
      'Ingress stack for workstation k8s',
    );
    [this.k8sWorkstationHelmStack].forEach(stack => this.addDependency(stack));
  }
}
