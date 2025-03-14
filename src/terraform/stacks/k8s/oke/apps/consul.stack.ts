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
import { K8S_Oke_Apps_IngressController_Stack } from './ingress-controller.stack';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import _ from 'lodash';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';

@Injectable()
export class K8S_Oke_Apps_Consul_Stack extends AbstractStack {
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

  meta = {
    name: 'consul',
  };

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  consulRelease = this.provide(Release, 'consulRelease', () => {
    const consulUiServicePort = 443;

    const { helmSet, helmSetList } = convertJsonToHelmSet({
      global: {
        peering: {
          enabled: false,
        },
        tls: {
          enabled: true,
        },
      },
      server: {
        enabled: true,
        replicas: 1,
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
    });

    return [
      {
        name: this.meta.name,
        chart: 'consul',
        repository: 'https://helm.releases.hashicorp.com',
        namespace: this.namespace.element.metadata.name,
        // @See https://github.com/hashicorp/consul-k8s/blob/main/charts/consul/values.yaml
        setSensitive: helmSet,
        setList: helmSetList,
      },
      {
        ui: {
          serviceName: `${this.meta.name}-${this.namespace.element.metadata.name}-ui`,
          port: consulUiServicePort,
        },
      },
    ];
  });

  consulUiIngress = this.provide(IngressV1, 'consulUiIngress', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
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
                    name: this.consulRelease.shared.ui.serviceName,
                    port: {
                      number: this.consulRelease.shared.ui.port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
    dependsOn: [this.consulRelease.element],
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
    private readonly k8sOkeAppsIngressControllerStack: K8S_Oke_Apps_IngressController_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Consul_Stack.name,
      'Consul stack for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsIngressControllerStack);
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
