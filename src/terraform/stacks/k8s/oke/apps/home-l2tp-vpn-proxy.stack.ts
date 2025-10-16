import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import {
  StatefulSetV1,
  StatefulSetV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/stateful-set-v1';

import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_HomeL2tpVpnProxy_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps
      .homeL2tpVpnProxy;

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
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.homeL2tpVpnProxy,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  configMap = this.provide(ConfigMapV1, 'configMap', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      'startup.sh': Fn.file(
        path.join(
          process.cwd(),
          'assets/static/home-l2tp-vpn-proxy.startup.sh',
        ),
      ),
    },
  }));

  secret = this.provide(SecretV1, 'secret', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      PROXY_PORT:
        this.metadata.shared.services.vpn.ports[
          'home-l2tp-vpn-proxy'
        ].port.toString(),
      VPN_SERVER_ADDR: this.config.vpnServerAddr,
      VPN_IPS_TO_ROUTE: this.config.vpnIpsToRoute.join(','),
      VPN_GATEWAY_IP: this.config.vpnGatewayIp,
      ...Object.fromEntries(
        this.config.vpnAccounts
          .map(({ username, password }, index) => [
            [`VPN_USERNAME_${index}`, username],
            [`VPN_PASSWORD_${index}`, password],
          ])
          .flat(),
      ),
    },
    type: 'Opaque',
  }));

  service = this.provide(ServiceV1, 'service', () => [
    {
      metadata: {
        name: this.metadata.shared.services.vpn.name,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        selector: this.metadata.shared.services.vpn.labels,
        port: Object.values(this.metadata.shared.services.vpn.ports),
      },
    },
    {
      proxyHost: `${this.namespace.element.metadata.name}.${this.metadata.shared.services.vpn.name}`,
      proxyPort:
        this.metadata.shared.services.vpn.ports['home-l2tp-vpn-proxy'].port,
    },
  ]);

  statefulSet = this.provide(StatefulSetV1, 'statefulSet', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      serviceName: this.metadata.shared.services.vpn.name,
      replicas: this.config.vpnAccounts.length.toString(),
      updateStrategy: [
        {
          type: 'RollingUpdate',
          rollingUpdate: [
            {
              partition: 1,
            },
          ],
        },
      ],
      selector: {
        matchLabels: this.metadata.shared.services.vpn.labels,
      },
      template: {
        metadata: {
          labels: this.metadata.shared.services.vpn.labels,
        },
        spec: {
          initContainer: [
            {
              name: 'chmod-startup-sh',
              image: 'busybox',
              command: [
                'sh',
                '-c',
                'cp /startup.sh /executable && chmod +x /executable/startup.sh',
              ],
              volumeMount: [
                {
                  name: this.configMap.element.metadata.name,
                  mountPath: '/startup.sh',
                  subPath: 'startup.sh',
                },
                {
                  name: 'executable-startup',
                  mountPath: '/executable',
                },
              ],
            },
          ],
          container: [
            {
              name: this.metadata.shared.services.vpn.name,
              image: 'jdrouet/l2tp-ipsec-vpn-client',

              imagePullPolicy: 'Always',
              ports: Object.values(
                this.metadata.shared.services.vpn.ports,
              ).map<StatefulSetV1SpecTemplateSpecContainerPort>(eachPort => ({
                containerPort: parseInt(eachPort.targetPort),
                protocol: eachPort.protocol,
              })),
              securityContext: {
                privileged: true,
              },
              volumeMount: [
                {
                  name: 'executable-startup',
                  mountPath: 'startup.sh',
                  subPath: 'startup.sh',
                },
                {
                  name: 'lib-modules',
                  mountPath: '/lib/modules',
                  readOnly: true,
                },
              ],
              envFrom: [
                {
                  secretRef: {
                    name: this.secret.element.metadata.name,
                  },
                },
              ],
              livenessProbe: {
                exec: {
                  command: [
                    '/bin/sh',
                    '-c',
                    `curl --socks5 localhost:$PROXY_PORT $VPN_GATEWAY_IP`,
                  ],
                },
                initialDelaySeconds: 120,
                timeoutSeconds: 5,
                periodSeconds: 15,
                failureThreshold: 3,
              },
            },
          ],
          volume: [
            {
              name: this.configMap.element.metadata.name,
              configMap: {
                items: [
                  {
                    key: 'startup.sh',
                    path: 'startup.sh',
                  },
                ],
                name: this.configMap.element.metadata.name,
              },
            },
            {
              name: 'executable-startup',
              emptyDir: {},
            },
            {
              name: 'lib-modules',
              hostPath: {
                path: '/lib/modules',
                type: 'Directory',
              },
            },
          ],
        },
      },
    },
    lifecycle: {
      replaceTriggeredBy: [
        `${this.configMap.element.terraformResourceType}.${this.configMap.element.friendlyUniqueId}`,
        `${this.secret.element.terraformResourceType}.${this.secret.element.friendlyUniqueId}`,
      ],
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_HomeL2tpVpnProxy_Stack.name,
      'Home L2TP VPN Proxy stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsIstioStack);
  }
}
