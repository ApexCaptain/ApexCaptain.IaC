import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Apps_CertManager_Stack } from './cert-manager.stack';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import { AbstractStack, CertManagerClusterIssuer } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Oke_Apps_CertManager_CRD_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  letsEncryptProdClusterIssuer = this.provide(
    CertManagerClusterIssuer,
    'letsEncryptProdClusterIssuer',
    id => {
      const name = `${this.k8sOkeAppsCertManagerStack.namespace.element.metadata.name}-${_.kebabCase(id)}`;
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
                          name: this.k8sOkeAppsCertManagerStack
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

  letsEncryptStagingClusterIssuer = this.provide(
    CertManagerClusterIssuer,
    'letsEncryptStagingClusterIssuer',
    id => {
      const name = `${this.k8sOkeAppsCertManagerStack.namespace.element.metadata.name}-${_.kebabCase(id)}`;
      return [
        {
          manifest: {
            metadata: {
              name,
            },
            spec: {
              acme: {
                server:
                  'https://acme-staging-v02.api.letsencrypt.org/directory',
                email:
                  this.globalConfigService.config.terraform.config.providers
                    .cloudflare.ApexCaptain.email,
                privateKeySecretRef: {
                  name: 'letsencrypt-staging',
                },
                solvers: [
                  {
                    dns01: {
                      cloudflare: {
                        email:
                          this.globalConfigService.config.terraform.config
                            .providers.cloudflare.ApexCaptain.email,
                        apiTokenSecretRef: {
                          name: this.k8sOkeAppsCertManagerStack
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
    private readonly k8sOkeAppsCertManagerStack: K8S_Oke_Apps_CertManager_Stack,
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_CertManager_CRD_Stack.name,
      'Cert Manager CRD for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsCertManagerStack);
  }
}
