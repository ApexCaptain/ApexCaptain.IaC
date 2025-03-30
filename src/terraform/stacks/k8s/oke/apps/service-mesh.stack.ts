import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Apps_Consul_Stack } from './consul.stack';
import { ConsulProvider } from '@lib/terraform/providers/consul/provider';
import { ConfigEntryServiceDefaults } from '@lib/terraform/providers/consul/config-entry-service-defaults';
import { ConfigEntryServiceIntentions } from '@lib/terraform/providers/consul/config-entry-service-intentions';

@Injectable()
export class K8S_Oke_Apps_ServiceMesh_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      // consul: this.provide(ConsulProvider, 'consulProvider', () => ({
      //   address:
      //     this.k8sOkeAppsConsulStack.consulApiEndpointSource.shared.address,
      //   token: this.k8sOkeAppsConsulStack.consulApiEndpointSource.shared.token,
      // })),
    },
  };

  // testServiceDefaults = this.provide(
  //   ConfigEntryServiceDefaults,
  //   'testServiceDefaults',
  //   () => ({
  //     name: 'test',
  //     protocol: 'http',
  //     expose: [
  //       {
  //         paths: [
  //           {
  //             path: '/',
  //             protocol: 'http',
  //             listenerPort: 18001,
  //             localPathPort: 8001,
  //           },
  //         ],
  //       },
  //     ],
  //   }),
  // );

  // test2ServiceDefaults = this.provide(
  //   ConfigEntryServiceDefaults,
  //   'test2ServiceDefaults',
  //   () => ({
  //     name: 'test2',
  //     protocol: 'http',
  //     expose: [
  //       {
  //         paths: [
  //           {
  //             path: '/',
  //             protocol: 'http',
  //             listenerPort: 18002,
  //             localPathPort: 8002,
  //           },
  //         ],
  //       },
  //     ],
  //   }),
  // );

  // testIntention = this.provide(
  //   ConfigEntryServiceIntentions,
  //   'testIntention',
  //   () => ({
  //     name: 'test',
  //     sources: [
  //       {
  //         name: 'test2',
  //         action: 'allow',
  //       },
  //     ],
  //   }),
  // );

  // test2Intention = this.provide(
  //   ConfigEntryServiceIntentions,
  //   'test2Intention',
  //   () => ({
  //     name: 'test2',
  //     sources: [
  //       {
  //         name: 'test',
  //         action: 'allow',
  //       },
  //     ],
  //   }),
  // );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeAppsConsulStack: K8S_Oke_Apps_Consul_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ServiceMesh_Stack.name,
      'Service Mesh stack for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsConsulStack);
  }
}
