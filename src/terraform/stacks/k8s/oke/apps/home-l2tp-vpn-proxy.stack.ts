import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import path from 'path';
import _ from 'lodash';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { K8S_Oke_Apps_Consul_Stack } from './consul.stack';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_System_Stack } from '../system.stack';

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

  // private readonly metadata = this.provide(Resource, 'metadata', () => [
  //   {},
  //   this.k8sOkeSystemStack.applicationMetadata.shared.homeL2tpVpnProxy,
  // ]);

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.metadata.shared.namespace,
  //   },
  // }));

  // configmap = this.provide(ConfigMapV1, 'configmap', id => ({
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   data: {
  //     'startup.sh': Fn.file(
  //       path.join(
  //         process.cwd(),
  //         'assets/static/home-l2tp-vpn-proxy.startup.sh',
  //       ),
  //     ),
  //   },
  // }));

  // secret = this.provide(SecretV1, 'secret', id => ({
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   data: {
  //     PROXY_PORT:
  //       this.metadata.shared.services.homeL2tpVpnProxy.ports[0].port.toString(),
  //     VPN_SERVER_ADDR: this.config.vpnServerAddr,
  //     VPN_USERNAME: this.config.vpnUsername,
  //     VPN_PASSWORD: this.config.vpnPassword,
  //     VPN_IPS_TO_ROUTE: this.config.vpnIpsToRoute,
  //     VPN_GATEWAY_IP: this.config.vpnGatewayIp,
  //   },
  //   type: 'Opaque',
  // }));

  // service = this.provide(ServiceV1, 'service', () => ({
  //   metadata: {
  //     name: this.metadata.shared.services.homeL2tpVpnProxy.name,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     selector: this.metadata.shared.services.homeL2tpVpnProxy.labels,
  //     port: this.metadata.shared.services.homeL2tpVpnProxy.ports,
  //   },
  // }));

  // deployment = this.provide(DeploymentV1, 'deployment', id => ({
  //   metadata: {
  //     name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     replicas: '1',
  //     selector: {
  //       matchLabels: this.metadata.shared.services.homeL2tpVpnProxy.labels,
  //     },
  //     template: {
  //       metadata: {
  //         labels: this.metadata.shared.services.homeL2tpVpnProxy.labels,
  //         annotations: {
  //           'consul.hashicorp.com/connect-inject': 'true',
  //         },
  //       },
  //       spec: {
  //         initContainer: [
  //           {
  //             name: 'chmod-startup-sh',
  //             image: 'busybox',
  //             command: [
  //               'sh',
  //               '-c',
  //               'cp /startup.sh /executable && chmod +x /executable/startup.sh',
  //             ],
  //             volumeMount: [
  //               {
  //                 name: this.configmap.element.metadata.name,
  //                 mountPath: '/startup.sh',
  //                 subPath: 'startup.sh',
  //               },
  //               {
  //                 name: 'executable-startup',
  //                 mountPath: '/executable',
  //               },
  //             ],
  //           },
  //         ],
  //         container: [
  //           {
  //             name: this.metadata.shared.services.homeL2tpVpnProxy.name,
  //             image: 'jdrouet/l2tp-ipsec-vpn-client',
  //             imagePullPolicy: 'Always',
  //             ports:
  //               this.metadata.shared.services.homeL2tpVpnProxy.ports.map<DeploymentV1SpecTemplateSpecContainerPort>(
  //                 eachPort => ({
  //                   containerPort: parseInt(eachPort.targetPort),
  //                   protocol: eachPort.protocol,
  //                 }),
  //               ),
  //             securityContext: {
  //               privileged: true,
  //             },
  //             volumeMount: [
  //               {
  //                 name: 'executable-startup',
  //                 mountPath: 'startup.sh',
  //                 subPath: 'startup.sh',
  //               },
  //               {
  //                 name: 'lib-modules',
  //                 mountPath: '/lib/modules',
  //                 readOnly: true,
  //               },
  //             ],
  //             envFrom: [
  //               {
  //                 secretRef: {
  //                   name: this.secret.element.metadata.name,
  //                 },
  //               },
  //             ],
  //             livenessProbe: {
  //               exec: {
  //                 command: [
  //                   '/bin/sh',
  //                   '-c',
  //                   `nc -z localhost ${this.metadata.shared.services.homeL2tpVpnProxy.ports[0].port} && ping -c 2 ${this.config.vpnGatewayIp}`,
  //                 ],
  //               },
  //               initialDelaySeconds: 120,
  //               timeoutSeconds: 5,
  //               periodSeconds: 10,
  //               failureThreshold: 3,
  //             },
  //           },
  //         ],
  //         volume: [
  //           {
  //             name: this.configmap.element.metadata.name,
  //             configMap: {
  //               items: [
  //                 {
  //                   key: 'startup.sh',
  //                   path: 'startup.sh',
  //                 },
  //               ],
  //               name: this.configmap.element.metadata.name,
  //             },
  //           },
  //           {
  //             name: 'executable-startup',
  //             emptyDir: {},
  //           },
  //           {
  //             name: 'lib-modules',
  //             hostPath: {
  //               path: '/lib/modules',
  //               type: 'Directory',
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   },
  //   lifecycle: {
  //     replaceTriggeredBy: [
  //       `${this.configmap.element.terraformResourceType}.${this.configmap.element.friendlyUniqueId}`,
  //       `${this.secret.element.terraformResourceType}.${this.secret.element.friendlyUniqueId}`,
  //     ],
  //   },
  //   dependsOn: [this.service.element],
  // }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeAppsConsulStack: K8S_Oke_Apps_Consul_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_HomeL2tpVpnProxy_Stack.name,
      'Home L2TP VPN Proxy stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsConsulStack);
  }
}
