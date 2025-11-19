import { Injectable } from '@nestjs/common';
import { LocalBackend, LocalExecProvisioner } from 'cdktf';
import dedent from 'dedent';
import yaml from 'yaml';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_Network_Stack } from '../network.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { IstioPeerAuthentication, OciNetworkProtocol } from '@/common';
import { AbstractStack } from '@/common/abstract/abstract.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_Istio_Stack extends AbstractStack {
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

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.istio,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'topology.istio.io/network':
          this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
            .okeClusterName,
      },
    },
  }));

  istioBaseRelease = this.provide(Release, 'istioBaseRelease', () => {
    return {
      name: this.metadata.shared.helm.base.name,
      chart: this.metadata.shared.helm.base.chart,
      repository: this.metadata.shared.helm.base.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
    };
  });
  istiodRelease = this.provide(Release, 'istiodRelease', () => {
    const okeAuthentikProxyOutpostName = 'oke-authentik-proxy-outpost';
    const okeAuthentikProxyProviderName = 'oke-authentik-proxy-provider';

    const istiodServiceInternalDomain = `istiod.${this.namespace.element.metadata.name}.svc.cluster.local`;

    return [
      {
        name: this.metadata.shared.helm.istiod.name,
        chart: this.metadata.shared.helm.istiod.chart,
        repository: this.metadata.shared.helm.istiod.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        dependsOn: [this.istioBaseRelease.element],
        values: [
          yaml.stringify({
            global: {
              meshID:
                this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
                  .meshId,
              externalIstiod: true,
              multiCluster: {
                clusterName:
                  this.globalConfigService.config.terraform.stacks.k8s
                    .serviceMesh.okeClusterName,
              },
              network:
                this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
                  .okeClusterName,
            },
            meshConfig: {
              defaultConfig: {
                proxyMetadata: {
                  ISTIO_META_DNS_CAPTURE: 'true',
                  CLUSTER_ID:
                    this.globalConfigService.config.terraform.stacks.k8s
                      .serviceMesh.okeClusterName,
                },
              },
              trustDomain: 'cluster.local',
              accessLogFile: '/dev/stdout',

              extensionProviders: [
                {
                  name: okeAuthentikProxyProviderName,
                  envoyExtAuthzHttp: {
                    service: `ak-outpost-${okeAuthentikProxyOutpostName}.authentik.svc.cluster.local`,
                    port: '9000',
                    pathPrefix: '/outpost.goauthentik.io/auth/envoy',
                    headersToDownstreamOnAllow: ['set-cookie'],
                    headersToUpstreamOnAllow: ['x-authentik-*', 'cookie'],
                    includeRequestHeadersInCheck: ['cookie'],
                  },
                },
              ],
            },
          }),
        ],
      },
      {
        okeAuthentikProxyOutpostName,
        okeAuthentikProxyProviderName,
        istiodServiceInternalDomain,
      },
    ];
  });

  istioEastWestGatewayRelease = this.provide(
    Release,
    'istioEastWestGatewayRelease',
    () => {
      const istioLabel = 'eastwestgateway';
      const name = `istio-${istioLabel}`;

      return [
        {
          name: this.metadata.shared.helm.istioEastWestGateway.name,
          chart: this.metadata.shared.helm.istioEastWestGateway.chart,
          repository: this.metadata.shared.helm.istioEastWestGateway.repository,
          namespace: this.namespace.element.metadata.name,
          createNamespace: false,
          dependsOn: [
            this.istioBaseRelease.element,
            this.istiodRelease.element,
          ],
          values: [
            yaml.stringify({
              name,
              networkGateway:
                this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
                  .okeClusterName,
              service: {
                type: 'LoadBalancer',
                loadBalancerIP:
                  this.k8sOkeNetworkStack
                    .ingressControllerFlexibleLoadbalancerReservedPublicIp
                    .element.ipAddress,
                annotations: {
                  'service.beta.kubernetes.io/oci-load-balancer-security-list-management-mode':
                    'None',
                  'service.beta.kubernetes.io/oci-load-balancer-shape':
                    'flexible',
                  'service.beta.kubernetes.io/oci-load-balancer-shape-flex-max':
                    '10',
                  'service.beta.kubernetes.io/oci-load-balancer-shape-flex-min':
                    '10',
                },
              },
            }),
          ],
        },
        { name, istioLabel },
      ];
    },
  );

  /**
   * @Note
   * networkGateway 지정하면 무조건 East-West Gateway로 만들어져서, Helm values에서 포트 설정이 다 무시됨
   * LB 값 아끼려면 이렇게 별도 스크립트 짜는 수밖에 없는듯...
   * 회사에서 쓸 때는 그냥 맘 편하게 LB 하나 더 할당하도록 하자, 그게 더 안전하기도 함
   *
   * Flexible Load Balancer 사용 시 UDP 포트 사용이 불가능 하므로 TCP만 할당함
   * NLB로 변경하면 가능은 한데, NLB는 존재하는 것 만으로도 비용 차지가 발생
   */
  istioEastWestGatewayServicePortPatch = this.provide(
    Resource,
    'istioEastWestGatewayServicePortPatch',
    () => {
      const kubeConfigPath =
        this.k8sOkeEndpointStack.okeEndpointSource.shared.kubeConfigFilePath;
      const proxyUrl =
        this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5;
      const serviceName = this.istioEastWestGatewayRelease.shared.name;
      const namespace = this.namespace.element.metadata.name;

      const additionalPorts: {
        port: number;
        name: string;
        targetPort: number;
        protocol: string;
        present: boolean;
      }[] = [
        {
          port: this.k8sOkeNetworkStack.loadbalancerPortMappings.httpPort
            .inbound,
          name: 'http',
          targetPort:
            this.k8sOkeNetworkStack.loadbalancerPortMappings.httpPort.inbound,
          protocol:
            this.k8sOkeNetworkStack.loadbalancerPortMappings.httpPort
              .protocol === OciNetworkProtocol.TCP
              ? 'TCP'
              : 'UDP',
          present: true,
        },
        {
          port: this.k8sOkeNetworkStack.loadbalancerPortMappings.httpsPort
            .inbound,
          name: 'https',
          targetPort:
            this.k8sOkeNetworkStack.loadbalancerPortMappings.httpsPort.inbound,
          protocol:
            this.k8sOkeNetworkStack.loadbalancerPortMappings.httpsPort
              .protocol === OciNetworkProtocol.TCP
              ? 'TCP'
              : 'UDP',
          present: true,
        },
        {
          port: this.k8sOkeNetworkStack.loadbalancerPortMappings
            .prometheusRemoteWritePort.inbound,
          name: 'prometheus-remote-write',
          targetPort:
            this.k8sOkeNetworkStack.loadbalancerPortMappings
              .prometheusRemoteWritePort.inbound,
          protocol:
            this.k8sOkeNetworkStack.loadbalancerPortMappings
              .prometheusRemoteWritePort.protocol === OciNetworkProtocol.TCP
              ? 'TCP'
              : 'UDP',
          present: true,
        },
        {
          port: this.k8sOkeNetworkStack.loadbalancerPortMappings
            .lokiRemoteWritePort.inbound,
          name: 'loki-remote-write',
          targetPort:
            this.k8sOkeNetworkStack.loadbalancerPortMappings.lokiRemoteWritePort
              .inbound,
          protocol:
            this.k8sOkeNetworkStack.loadbalancerPortMappings.lokiRemoteWritePort
              .protocol === OciNetworkProtocol.TCP
              ? 'TCP'
              : 'UDP',
          present: true,
        },
      ];

      const provisioners = additionalPorts.map<LocalExecProvisioner>(
        ({ port, name, targetPort, protocol, present }) => {
          if (present) {
            return {
              type: 'local-exec',
              command: dedent`
                port_exists=$(kubectl get svc ${serviceName} -n ${namespace} \
                  -o jsonpath='{.spec.ports[?(@.port==${port})].port}' 2>/dev/null || echo '')
                if [ -z "$port_exists" ]; then
                  kubectl patch svc ${serviceName} -n ${namespace} \
                    --type='json' \
                    -p='[{"op": "add", "path": "/spec/ports/-", "value": {"name": "${name}", "port": ${port}, "protocol": "${protocol}", "targetPort": ${targetPort}}}]' || true
                fi
              `,
              environment: {
                KUBECONFIG: kubeConfigPath,
                HTTPS_PROXY: proxyUrl,
              },
            };
          } else {
            return {
              type: 'local-exec',
              command: dedent`
                  port_exists=$(kubectl get svc ${serviceName} -n ${namespace} \
                    -o jsonpath="{.spec.ports[?(@.port==${port})].port}" 2>/dev/null || echo '')

                  if [ -z "$port_exists" ]; then
                    exit 0
                  fi

                  ports_list=$(kubectl get svc ${serviceName} -n ${namespace} \
                    -o jsonpath='{.spec.ports[*].port}' 2>/dev/null || echo '')
                  
                  idx=0
                  for port_item in $ports_list; do
                    if [ "$port_item" = "${port}" ]; then
                      kubectl patch svc ${serviceName} -n ${namespace} \
                        --type='json' \
                        -p="[{\"op\": \"remove\", \"path\": \"/spec/ports/$idx\"}]" || exit 1
                      exit 0
                    fi
                    idx=$((idx + 1))
                  done
                  
                  exit 1
              `,
              environment: {
                KUBECONFIG: kubeConfigPath,
                HTTPS_PROXY: proxyUrl,
              },
            };
          }
        },
      );

      return {
        triggers: {
          releaseId: this.istioEastWestGatewayRelease.element.id,
          ports: JSON.stringify(additionalPorts),
        },
        dependsOn: [this.istioEastWestGatewayRelease.element],
        provisioners,
      };
    },
  );

  defaultPeerAuthentication = this.provide(
    IstioPeerAuthentication,
    'defaultPeerAuthentication',
    () => ({
      manifest: {
        metadata: {
          name: 'default',
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          mtls: {
            mode: 'PERMISSIVE' as const,
          },
        },
      },
      dependsOn: [this.istioBaseRelease.element],
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Istio_Stack.name,
      'Istio stack for OKE k8s',
    );
  }
}
