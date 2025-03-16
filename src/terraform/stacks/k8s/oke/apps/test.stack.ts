import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import {
  DeploymentV1,
  DeploymentV1SpecTemplateSpecContainerPort,
} from '@lib/terraform/providers/kubernetes/deployment-v1';
import _ from 'lodash';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { K8S_Oke_System_Stack } from '../system.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_Apps_Consul_Stack } from './consul.stack';

@Injectable()
export class K8S_Oke_Apps_Test_Stack extends AbstractStack {
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
    this.k8sOkeSystemStack.applicationMetadata.shared.test,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  service = this.provide(ServiceV1, 'service', () => ({
    metadata: {
      name: this.metadata.shared.services.test.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.test.labels,
      port: this.metadata.shared.services.test.ports,
    },
  }));

  deployment = this.provide(DeploymentV1, 'deployment', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      replicas: '1',
      selector: {
        matchLabels: this.metadata.shared.services.test.labels,
      },
      template: {
        metadata: {
          labels: this.metadata.shared.services.test.labels,
          // annotations: {
          //   'consul.hashicorp.com/connect-inject': 'true',
          // },
        },
        spec: {
          container: [
            {
              name: this.metadata.shared.services.test.name,
              image: 'nginx:latest',
              ports:
                this.metadata.shared.services.test.ports.map<DeploymentV1SpecTemplateSpecContainerPort>(
                  eachPort => ({
                    containerPort: parseInt(eachPort.targetPort),
                    protocol: eachPort.protocol,
                  }),
                ),
            },
          ],
        },
      },
    },
  }));

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
      K8S_Oke_Apps_Test_Stack.name,
      'Test stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsConsulStack);
  }
}
