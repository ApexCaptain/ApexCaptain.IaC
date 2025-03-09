import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import path from 'path';
import _ from 'lodash';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';

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

  meta = {
    name: 'home-l2tp-vpn-proxy',
    labels: {
      app: 'home-l2tp-vpn-proxy',
    },
    port: {
      proxy: {
        containerPort: 11530,
        servicePort: 11530,
      },
    },
  };

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  configmap = this.provide(ConfigMapV1, 'configmap', id => ({
    metadata: {
      name: `${this.meta.name}-${_.kebabCase(id)}`,
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
      name: `${this.meta.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      PROXY_PORT: this.meta.port.proxy.containerPort.toString(),
      VPN_SERVER_ADDR: this.config.vpnServerAddr,
      VPN_USERNAME: this.config.vpnUsername,
      VPN_PASSWORD: this.config.vpnPassword,
      VPN_IPS_TO_ROUTE: this.config.vpnIpsToRoute,
      VPN_GATEWAY_IP: this.config.vpnGatewayIp,
    },
    type: 'Opaque',
  }));

  deployment = this.provide(DeploymentV1, 'deployment', id => ({
    metadata: {
      name: `${this.meta.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      replicas: '1',
      selector: {
        matchLabels: this.meta.labels,
      },
      template: {
        metadata: {
          labels: this.meta.labels,
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
                  name: this.configmap.element.metadata.name,
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
              name: this.meta.name,
              image: 'jdrouet/l2tp-ipsec-vpn-client',
              imagePullPolicy: 'Always',
              port: [
                {
                  containerPort: this.meta.port.proxy.containerPort,
                },
              ],
              securityContext: {
                privileged: true,
              },
              volumeMount: [
                {
                  name: 'executable-startup',
                  mountPath: 'startup.sh',
                  subPath: 'startup.sh',
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
                    `ping -c 4 ${this.config.vpnGatewayIp}`,
                  ],
                },
                tcpSocket: [
                  {
                    port: this.meta.port.proxy.containerPort.toString(),
                  },
                ],
                initialDelaySeconds: 60,
                timeoutSeconds: 10,
                periodSeconds: 30,
                failureThreshold: 3,
              },
            },
          ],
          volume: [
            {
              name: this.configmap.element.metadata.name,
              configMap: {
                items: [
                  {
                    key: 'startup.sh',
                    path: 'startup.sh',
                  },
                ],
                name: this.configmap.element.metadata.name,
              },
            },
            {
              name: 'executable-startup',
              emptyDir: {},
            },
          ],
        },
      },
    },
    lifecycle: {
      replaceTriggeredBy: [
        `${this.configmap.element.terraformResourceType}.${this.configmap.element.friendlyUniqueId}`,
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
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_HomeL2tpVpnProxy_Stack.name,
      'Home L2TP VPN Proxy stack for oke k8s',
    );
  }
}
