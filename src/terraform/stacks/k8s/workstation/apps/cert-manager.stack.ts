import { AbstractStack } from '@/common/abstract/abstract.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { CertManagerClusterIssuer, CertManagerCertificate } from '@/common';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import _ from 'lodash';
import yaml from 'yaml';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks';

@Injectable()
export class K8S_Workstation_Apps_CertManager_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation()
              .configPath,
          insecure: true,
        },
      })),
    },
  };

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.certManager,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  cloudflareApiTokenSecret = this.provide(
    SecretV1,
    'cloudflareApiTokenSecret',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      data: {
        'api-token':
          this.globalConfigService.config.terraform.config.providers.cloudflare
            .ApexCaptain.apiToken,
      },
      type: 'Opaque',
    }),
  );

  certManagerRelease = this.provide(Release, 'certManagerRelease', () => {
    return {
      name: this.metadata.shared.helm.certManager.name,
      chart: this.metadata.shared.helm.certManager.chart,
      repository: this.metadata.shared.helm.certManager.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          crds: {
            enabled: true,
            keep: false,
          },
          enableCertificateOwnerRef: true,
        }),
      ],
    };
  });

  letsEncryptProdClusterIssuer = this.provide(
    CertManagerClusterIssuer,
    'letsEncryptProdClusterIssuer',
    id => {
      const name = `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`;
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
                          name: this.cloudflareApiTokenSecret.element.metadata
                            .name,
                          key: 'api-token',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          dependsOn: [
            this.certManagerRelease.element,
            this.cloudflareApiTokenSecret.element,
          ],
        },
        { name },
      ];
    },
  );

  wildcardCertificate = this.provide(
    CertManagerCertificate,
    'wildcardCertificate',
    id => {
      const name = `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`;
      return [
        {
          manifest: {
            metadata: {
              name,
              namespace: this.namespace.element.metadata.name,
            },
            spec: {
              secretName: name,
              issuerRef: {
                name: this.letsEncryptProdClusterIssuer.shared.name,
                kind: 'ClusterIssuer',
              },
              dnsNames: [
                `*.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
                this.cloudflareZoneStack.dataAyteneve93Zone.element.name,
              ],
            },
          },
          dependsOn: [this.letsEncryptProdClusterIssuer.element],
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
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_CertManager_Stack.name,
      'Cert manager stack for workstation k8s',
    );
  }
}
