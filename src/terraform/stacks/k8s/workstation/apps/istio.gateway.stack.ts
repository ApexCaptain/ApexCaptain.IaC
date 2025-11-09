import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Apps_CertManager_CRD_Stack } from './cert-manager.crd.stack';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { AbstractStack, CertManagerCertificate, IstioGateway } from '@/common';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Apps_Istio_Gateway_Stack extends AbstractStack {
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

  istioGatewayWildcardCertificate = this.provide(
    CertManagerCertificate,
    'istioGatewayWildcardCertificate',
    id => {
      const secretName = _.kebabCase(id);
      return [
        {
          manifest: {
            metadata: {
              name: `${this.k8sWorkstationAppsIstioStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
              namespace:
                this.k8sWorkstationAppsIstioStack.namespace.element.metadata
                  .name,
            },
            spec: {
              secretName,
              issuerRef: {
                name: this.k8sWorkstationCertManagerCRDStack
                  .letsEncryptProdClusterIssuer.shared.name,
                kind: 'ClusterIssuer',
              },
              dnsNames: [
                `*.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
                this.cloudflareZoneStack.dataAyteneve93Zone.element.name,
              ],
            },
          },
        },
        { secretName },
      ];
    },
  );

  istioGateway = this.provide(IstioGateway, 'istioGateway', id => {
    const name = `${this.k8sWorkstationAppsIstioStack.namespace.element.metadata.name}-${_.kebabCase(id)}`;
    const gatewayPath = `${this.k8sWorkstationAppsIstioStack.namespace.element.metadata.name}/${name}`;
    const hosts = [
      `*.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
    ];
    return [
      {
        manifest: {
          metadata: {
            name,
            namespace:
              this.k8sWorkstationAppsIstioStack.namespace.element.metadata.name,
          },
          spec: {
            selector: {
              istio: 'gateway',
            },
            servers: [
              {
                port: {
                  number: 80,
                  name: 'http',
                  protocol: 'HTTP',
                },
                hosts,
                tls: {
                  httpsRedirect: true,
                },
              },
              {
                port: {
                  number: 443,
                  name: 'https',
                  protocol: 'HTTPS',
                },
                hosts,
                tls: {
                  mode: 'SIMPLE' as const,
                  credentialName:
                    this.istioGatewayWildcardCertificate.shared.secretName,
                },
              },
            ],
          },
        },
      },
      {
        name,
        gatewayPath,
      },
    ];
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
    private readonly k8sWorkstationCertManagerCRDStack: K8S_Workstation_Apps_CertManager_CRD_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Istio_Gateway_Stack.name,
      'Istio Gateway stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsIstioStack);
  }
}
