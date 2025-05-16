import { AbstractStack, K8sApplicationMetadata } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { K8S_Oke_Network_Stack } from '../network.stack';
import yaml from 'yaml';
import _ from 'lodash';
import { K8S_Oke_System_Stack } from '../system.stack';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_IngressController_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        }),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        },
      })),
    },
  };

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.ingressController,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  /**
   * @note
   * - Flexible Load Balancer 사용 시 UDP 포트 배포 불가능 함...
   * - 그래서 일단은 주석 처리 해둠.
   * - NLB로 변경하면 가능은 한데, NLB는 아무래도 존재하는 것 만으로도 비용 차지가 발생하는 것 같음. 추후 확인 필요.
   * - 아직까지 UDP 포트 개방이 필요한 상황이 아니므로 일단은 이대로 넘어가도 될듯?
   */
  release = this.provide(Release, 'release', () => {
    const values = {
      controller: {
        service: {
          type: 'LoadBalancer',
          loadBalancerIP:
            this.k8sOkeNetworkStack
              .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
              .ipAddress,
          annotations: {
            'service.beta.kubernetes.io/oci-load-balancer-security-list-management-mode':
              'None',
            'service.beta.kubernetes.io/oci-load-balancer-shape': 'flexible',
            // @ToDo 외부 요청에 따라 속도 조절
            'service.beta.kubernetes.io/oci-load-balancer-shape-flex-max': 100,
            'service.beta.kubernetes.io/oci-load-balancer-shape-flex-min': 100,
          },
        },
        config: {
          'allow-snippet-annotations': true,
          'annotations-risk-level': 'Critical',
        },
      },
      tcp: {},
      udp: {},
    };

    Object.values(this.k8sOkeSystemStack.applicationMetadata.shared).forEach(
      eachMetadata => {
        const services = eachMetadata[
          'services'
        ] as K8sApplicationMetadata['services'];
        if (!services) return;
        const namespace = eachMetadata.namespace;
        Object.values(services).forEach(eachService => {
          if (!eachService.ports) return;
          Object.values(eachService.ports)
            .filter(eachPort => eachPort.portBasedIngressPort)
            .forEach(eachPort => {
              const target = `${namespace}/${eachService.name}:${eachPort.port}`;
              if (eachPort.protocol?.toUpperCase() === 'UDP') {
                // udpReleaseSet.push({
                //   name: `udp.${eachPort.portBasedIngressPort!!.toString()}`,
                //   value: target,
                // });
              } else {
                values.tcp[`${eachPort.portBasedIngressPort!!.toString()}`] =
                  target;
              }
            });
        });
      },
    );

    return {
      name: this.metadata.shared.helm.ingressController.name,
      chart: this.metadata.shared.helm.ingressController.chart,
      repository: this.metadata.shared.helm.ingressController.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [yaml.stringify(values)],
    };
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_IngressController_Stack.name,
      'Ingress Controller for OKE k8s',
    );
  }
}
