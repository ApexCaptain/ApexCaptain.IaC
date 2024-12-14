import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Cluster_Stack } from './cluster.stack';

// @Injectable()
// export class K8S_Oke_Test_Stack extends AbstractStack {
//   terraform = {
//     backend: this.backend(LocalBackend, () =>
//       this.terraformConfigService.backends.localBackend.secrets({
//         stackName: this.id,
//       }),
//     ),
//     providers: {
//       kubernetes: this.provide(
//         KubernetesProvider,
//         'kubernetesProvider',
//         () => ({
//           configPath:
//             this.k8sOkeClusterStack.okeKubeConfig.shared.kubeConfigFile.element
//               .filename,
//         }),
//       ),
//     },
//   };

//   constructor(
//     // Terraform
//     private readonly terraformAppService: TerraformAppService,
//     private readonly terraformConfigService: TerraformConfigService,

//     // Stacks
//     private readonly k8sOkeClusterStack: K8S_Oke_Cluster_Stack,
//   ) {
//     super(
//       terraformAppService.cdktfApp,
//       K8S_Oke_Test_Stack.name,
//       'Test stack for OKE',
//     );
//   }
// }
