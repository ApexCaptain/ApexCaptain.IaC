import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Apps_CertManager_Stack } from './cert-manager.stack';
import { CertManagerCertificate, CertManagerClusterIssuer } from '@/common';
import { AbstractStack } from '@/common/abstract/abstract.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataKubernetesSecretV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-secret-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Apps_CertManager_CRD_Stack extends AbstractStack {
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

  letsEncryptProdClusterIssuer = this.provide(
    CertManagerClusterIssuer,
    'letsEncryptProdClusterIssuer',
    id => {
      const name = `${this.k8sWorkstationAppsCertManagerStack.namespace.element.metadata.name}-${_.kebabCase(id)}`;
      return [
        {
          manifest: {
            metadata: {
              name,
            },
            spec: {
              acme: {
                server: 'https://acme-v02.api.letsencrypt.org/directory',
                email:
                  this.globalConfigService.config.terraform.config.providers
                    .cloudflare.ApexCaptain.email,
                privateKeySecretRef: {
                  name: 'letsencrypt-prod',
                },
                solvers: [
                  {
                    dns01: {
                      cloudflare: {
                        email:
                          this.globalConfigService.config.terraform.config
                            .providers.cloudflare.ApexCaptain.email,
                        apiTokenSecretRef: {
                          name: this.k8sWorkstationAppsCertManagerStack
                            .cloudflareApiTokenSecret.element.metadata.name,
                          key: 'api-token',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        { name },
      ];
    },
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsCertManagerStack: K8S_Workstation_Apps_CertManager_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_CertManager_CRD_Stack.name,
      'CertManager CRD stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsCertManagerStack);
  }
}
