import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_CertManager_CRD_Stack } from './cert-manager.crd.stack';
import { K8S_Workstation_Apps_Metallb_Stack } from './metallb.stack';
import { CertManagerCertificate } from '@/common';
import { AbstractStack } from '@/common/abstract/abstract.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Apps_IngressController_Stack extends AbstractStack {
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

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.ingressController,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  nginxIngressControllerWildcardProductionCertificate = this.provide(
    CertManagerCertificate,
    'nginxIngressControllerWildcardProductionCertificate',
    id => {
      const secretName = _.kebabCase(id);
      return [
        {
          manifest: {
            metadata: {
              name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
              namespace: this.namespace.element.metadata.name,
            },
            spec: {
              secretName,
              issuerRef: {
                name: this.k8sWorkstationAppsCertManagerCRDStack
                  .letsEncryptStagingClusterIssuer.shared.name,
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
  nginxIngressControllerWildcardStagingCertificate = this.provide(
    CertManagerCertificate,
    'nginxIngressControllerWildcardStagingCertificate',
    id => {
      const secretName = _.kebabCase(id);
      return [
        {
          manifest: {
            metadata: {
              name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
              namespace: this.namespace.element.metadata.name,
            },
            spec: {
              secretName,
              issuerRef: {
                name: this.k8sWorkstationAppsCertManagerCRDStack
                  .letsEncryptStagingClusterIssuer.shared.name,
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

  release = this.provide(Release, 'release', () => {
    const values = {
      controller: {
        service: {
          type: 'LoadBalancer',
          loadBalancerIP:
            this.k8sWorkstationAppsMetallbStack.config.ingressControllerIp,
          annotations: {
            'metallb.universe.tf/allow-shared-ip': 'nginx-ingress',
          },
          externalTrafficPolicy: 'Local',
        },

        podAnnotations: {
          'traffic.sidecar.istio.io/excludeInboundPorts': '80,443',
          'traffic.sidecar.istio.io/includeInboundPorts': '',
        },
        admissionWebhooks: {
          patch: {
            podAnnotations: {
              'sidecar.istio.io/inject': 'false',
            },
          },
        },

        extraArgs: {
          'default-ssl-certificate': `${this.namespace.element.metadata.name}/${this.nginxIngressControllerWildcardStagingCertificate.shared.secretName}`,
        },
        config: {
          'allow-snippet-annotations': true,
          'annotations-risk-level': 'Critical',
          'use-forwarded-headers': 'true',
          'compute-full-forwarded-for': 'true',
        },
      },
      tcp: {},
      udp: {},
    };

    // Object.values(
    //   this.k8sWorkstationSystemStack.applicationMetadata.shared,
    // ).forEach(eachMetadata => {
    //   const services =
    //     eachMetadata.services as K8sApplicationMetadata['services'];
    //   if (!services) return;
    //   const namespace = eachMetadata.namespace;
    //   Object.values(services).forEach(eachService => {
    //     if (!eachService.ports) return;
    //     Object.values(eachService.ports)
    //       .filter(eachPort => eachPort.portBasedIngressPort)
    //       .forEach(eachPort => {
    //         const target = `${namespace}/${eachService.name}:${eachPort.port}`;
    //         if (eachPort.protocol?.toUpperCase() === 'UDP') {
    //           values.udp[`${eachPort.portBasedIngressPort!!.toString()}`] =
    //             target;
    //         } else {
    //           values.tcp[`${eachPort.portBasedIngressPort!!.toString()}`] =
    //             target;
    //         }
    //       });
    //   });
    // });

    return {
      name: this.metadata.shared.helm.ingressController.name,
      chart: this.metadata.shared.helm.ingressController.chart,
      repository: this.metadata.shared.helm.ingressController.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      forceUpdate: true,
      values: [yaml.stringify(values)],
    };
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationAppsMetallbStack: K8S_Workstation_Apps_Metallb_Stack,
    private readonly k8sWorkstationAppsCertManagerCRDStack: K8S_Workstation_Apps_CertManager_CRD_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_IngressController_Stack.name,
      'Ingress Controller for Workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsMetallbStack);
    this.addDependency(this.k8sWorkstationAppsCertManagerCRDStack);
  }
}
