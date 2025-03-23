import { Injectable } from '@nestjs/common';
import {
  AbstractStack,
  convertJsonToHelmSet,
  createExpirationInterval,
} from '@/common';
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
import _ from 'lodash';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_System_Stack } from '../system.stack';
import yaml from 'yaml';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';

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
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
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

  consulAclBootstrapToken = this.provide(
    StringResource,
    'consulAclBootstrapToken',
    () => ({
      length: 32,
      special: false,
      keepers: {
        expirationDate: createExpirationInterval({
          days: 30,
        }).toString(),
      },
    }),
  );

  consulAclBootstrapTokenSecret = this.provide(
    SecretV1,
    'consulAclBootstrapTokenSecret',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      data: {
        token: this.consulAclBootstrapToken.element.result,
      },
      type: 'Opaque',
    }),
  );

  release = this.provide(Release, 'release', () => {
    const ingressHost = `${this.cloudflareRecordStack.okeConsulRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`;

    const { helmSet, helmSetList } = convertJsonToHelmSet({
      global: {
        peering: {
          enabled: false,
        },
        tls: {
          enabled: true,
        },
        datacenter: 'ayteneve93-oke',
        acls: {
          manageSystemACLs: true,
          bootstrapToken: {
            secretName:
              this.consulAclBootstrapTokenSecret.element.metadata.name,
            secretKey: 'token',
          },
        },
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
        },
        ingress: {
          enabled: true,
          ingressClassName: 'nginx',
          pathType: 'Prefix',
          hosts: [
            {
              host: ingressHost,
              paths: ['/'],
            },
          ],
          annotations: yaml.stringify({
            'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
            'nginx.ingress.kubernetes.io/rewrite-target': '/',
            'kubernetes.io/ingress.class': 'nginx',
            'nginx.ingress.kubernetes.io/auth-url':
              this.k8sOkeAppsOAuth2ProxyStack.release.shared.authUrl,
            'nginx.ingress.kubernetes.io/auth-signin':
              this.k8sOkeAppsOAuth2ProxyStack.release.shared.authSignin,
            'nginx.ingress.kubernetes.io/auth-snippet': `
                if ($request_uri ~* "^/v1/.*") {
                  return 200;
                }
              `
              .split('\n')
              .map(line => line.trim())
              .filter(line => !_.isEmpty(line))
              .join('\n'),
          }),
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
        lifecycle: {
          replaceTriggeredBy: [
            `${this.consulAclBootstrapTokenSecret.element.terraformResourceType}.${this.consulAclBootstrapTokenSecret.element.friendlyUniqueId}`,
          ],
        },
      },
      { ingressHost },
    ];
  });

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
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
