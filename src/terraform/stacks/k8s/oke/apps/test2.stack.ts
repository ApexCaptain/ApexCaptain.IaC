import { Injectable } from '@nestjs/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Fn, LocalBackend } from 'cdktf';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Resource } from '@lib/terraform/providers/null/resource';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import _ from 'lodash';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { K8S_Oke_Apps_Consul_Stack } from './consul.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import path from 'path';

@Injectable()
export class K8S_Oke_Apps_Test2_Stack extends AbstractStack {
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

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.test2,
  ]);

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
  //     'default.conf': Fn.templatefile(
  //       path.join(process.cwd(), 'assets/templates/test.nginx.conf.tpl'),
  //       {
  //         NGINX_PORT:
  //           this.metadata.shared.services.test2.ports.nginxWeb.targetPort,
  //       },
  //     ),
  //   },
  // }));

  // service = this.provide(ServiceV1, 'service', () => ({
  //   metadata: {
  //     name: this.metadata.shared.services.test2.name,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     selector: this.metadata.shared.services.test2.labels,
  //     port: Object.values(this.metadata.shared.services.test2.ports),
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
  //       matchLabels: this.metadata.shared.services.test2.labels,
  //     },
  //     template: {
  //       metadata: {
  //         labels: this.metadata.shared.services.test2.labels,
  //         annotations: {
  //           'consul.hashicorp.com/connect-inject': 'true',
  //           'consul.hashicorp.com/transparent-proxy': 'true',
  //           // 'consul.hashicorp.com/connect-service-upstreams': 'test.test:18001',
  //         },
  //       },
  //       spec: {
  //         container: [
  //           {
  //             name: this.metadata.shared.services.test2.name,
  //             image: 'nginx:latest',
  //             ports: Object.values(
  //               this.metadata.shared.services.test2.ports,
  //             ).map<DeploymentV1SpecTemplateSpecContainerPort>(eachPort => ({
  //               containerPort: parseInt(eachPort.targetPort),
  //               protocol: eachPort.protocol,
  //             })),
  //             volumeMount: [
  //               {
  //                 name: this.configmap.element.metadata.name,
  //                 mountPath: '/etc/nginx/conf.d/default.conf',
  //                 subPath: 'default.conf',
  //               },
  //             ],
  //           },
  //         ],
  //         volume: [
  //           {
  //             name: this.configmap.element.metadata.name,
  //             configMap: {
  //               items: [{ key: 'default.conf', path: 'default.conf' }],
  //               name: this.configmap.element.metadata.name,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   },
  // }));

  constructor(
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
      K8S_Oke_Apps_Test2_Stack.name,
      'Test stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsConsulStack);
  }
}
