import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Oke_Apps_Test_Stack extends AbstractStack {
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
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  // https://github.com/encircle360-oss/rclone-nfs-server

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: 'test',
  //     labels: {
  //       'istio-injection': 'enabled',
  //     },
  //   },
  // }));

  // // k exec -it -n test deployment/test -n test -- /bin/sh
  // deployment = this.provide(DeploymentV1, 'deployment', () => {
  //   const nfsStoragePath = '/exports';

  //   return {
  //     metadata: {
  //       name: 'test',
  //       namespace: this.namespace.element.metadata.name,
  //     },
  //     spec: {
  //       replicas: '1',
  //       selector: {
  //         matchLabels: {
  //           app: 'test',
  //         },
  //       },
  //       template: {
  //         metadata: {
  //           labels: {
  //             app: 'test',
  //           },
  //         },
  //         spec: {
  //           container: [
  //             {
  //               name: 'test',
  //               image: 'itsthenetwork/nfs-server-alpine:latest-arm',
  //               imagePullPolicy: 'Always',
  //               command: [
  //                 '/bin/sh',
  //                 '-c',
  //                 'while true; do sleep 3600; done',
  //                 // dedent`
  //                 //   mkdir -p ${nfsStoragePath}
  //                 //   /usr/bin/nfsd.sh
  //                 // `,
  //               ],
  //               securityContext: {
  //                 capabilities: {
  //                   add: ['SYS_ADMIN', 'SETPCAP'],
  //                 },
  //               },
  //               env: [
  //                 {
  //                   name: 'SHARED_DIRECTORY',
  //                   value: nfsStoragePath,
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //       },
  //     },
  //   };
  // });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Test_Stack.name,
      'K8S OKE Test Stack',
    );
  }
}
