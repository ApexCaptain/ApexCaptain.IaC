import { Injectable } from '@nestjs/common';
import { AbstractStack, convertJsonToHelmSet } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Release } from '@lib/terraform/providers/helm/release';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import _ from 'lodash';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { DataKubernetesService } from '@lib/terraform/providers/kubernetes/data-kubernetes-service';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_System_Stack } from '../system.stack';

/**
 * @See https://www.youtube.com/watch?v=s3I1kKKfjtQ&t=4057s
 */
@Injectable()
export class K8S_Oke_Apps_Consul_Stack extends AbstractStack {
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
    this.k8sOkeSystemStack.applicationMetadata.shared.consul,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  release = this.provide(Release, 'release', () => {
    const consulUiServicePort = 443;

    const { helmSet, helmSetList } = convertJsonToHelmSet({
      global: {
        peering: {
          enabled: false,
        },
        tls: {
          enabled: true,
        },
        datacenter: 'ayteneve93-oke',
      },
      server: {
        enabled: true,
        replicas: 1,
        bootstrapExpect: 1,
        extraConfig: `
          {
            "log_level": "TRACE"
          }
          `,
      },
      connectInject: {
        enabled: true,
        default: false,
      },
      // @ToDo 나중에 이 부분 enable 하고 workstation의 consul하고 연결해야 함
      meshGateway: {
        enabled: false,
        replicas: 2,
        service: {
          type: 'LoadBalancer',
          annotations: `
          {
            "oci.oraclecloud.com/load-balancer-type": "nlb"
          }
          `,
        },
      },
      ui: {
        enabled: true,
        service: {
          enabled: true,
          type: 'ClusterIP',
          port: {
            https: consulUiServicePort.toString(),
          },
        },
      },
      client: {
        enabled: true,
      },
    });

    return [
      {
        name: this.metadata.shared.helm.consul.name,
        chart: this.metadata.shared.helm.consul.chart,
        repository: this.metadata.shared.helm.consul.repository,
        namespace: this.namespace.element.metadata.name,
        setSensitive: helmSet,
        setList: helmSetList,
      },
      {
        server: {
          serviceName: `${this.namespace.element.metadata.name}-${this.metadata.shared.helm.consul.name}-server`,
          port: 8501,
        },
        ui: {
          serviceName: `${this.namespace.element.metadata.name}-${this.metadata.shared.helm.consul.name}-ui`,
          port: consulUiServicePort,
        },
      },
    ];
  });

  dataServerService = this.provide(
    DataKubernetesService,
    'dataServerService',
    () => ({
      metadata: {
        name: this.release.shared.server.serviceName,
        namespace: this.namespace.element.metadata.name,
      },
      dependsOn: [this.release.element],
    }),
  );

  // Server Service
  service = this.provide(ServiceV1, 'service', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,

      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      type: 'ClusterIP',
      selector: this.dataServerService.element.spec.get(0).selector as any,
      port: [
        {
          name: 'consul',
          port: this.release.shared.server.port,
          targetPort: this.release.shared.server.port.toString(),
        },
      ],
    },
  }));

  // Ui Ingress
  ingress = this.provide(IngressV1, 'ingress', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'kubernetes.io/ingress.class': 'nginx',

        'nginx.ingress.kubernetes.io/auth-url':
          this.k8sOkeAppsOAuth2ProxyStack.release.shared.authUrl,
        'nginx.ingress.kubernetes.io/auth-signin':
          this.k8sOkeAppsOAuth2ProxyStack.release.shared.authSignin,
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.okeConsulRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.release.shared.ui.serviceName,
                    port: {
                      number: this.release.shared.ui.port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
    dependsOn: [this.release.element],
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Consul_Stack.name,
      'Consul stack for OKE k8s',
    );
  }
}
