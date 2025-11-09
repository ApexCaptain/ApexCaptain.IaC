import fs from 'fs';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Workstation_Apps_Authentik_Stack } from '../../workstation/apps/authentik.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataAuthentikFlow } from '@lib/terraform/providers/authentik/data-authentik-flow';
import { DataAuthentikServiceConnectionKubernetes } from '@lib/terraform/providers/authentik/data-authentik-service-connection-kubernetes';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { ServiceConnectionKubernetes } from '@lib/terraform/providers/authentik/service-connection-kubernetes';

@Injectable()
export class K8S_Oke_Apps_Authentik_Resources_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps.authentik;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      authentik: this.provide(
        AuthentikProvider,
        'authentikProvider',
        () =>
          this.k8sOkeAppsAuthentikStack.authentikProviderConfig.shared.config,
      ),
    },
  };

  dataLocalK8sClusterServiceConnection = this.provide(
    DataAuthentikServiceConnectionKubernetes,
    'dataLocalK8sClusterServiceConnection',
    () => ({
      name: 'Local Kubernetes Cluster',
    }),
  );

  // default-provider-authorization-implicit-consent
  dataDefaultProviderAuthorizationImplicitConsent = this.provide(
    DataAuthentikFlow,
    'dataDefaultProviderAuthorizationImplicitConsent',
    () => ({
      slug: 'default-provider-authorization-implicit-consent',
    }),
  );

  dataDefaultInvalidationFlow = this.provide(
    DataAuthentikFlow,
    'dataDefaultInvalidationFlow',
    () => ({
      slug: 'default-invalidation-flow',
    }),
  );

  workstationKubernetesCluster = this.provide(
    ServiceConnectionKubernetes,
    'workstationKubernetesCluster',
    id => {
      const targetClusterName = 'workstation-cluster';
      const targetContextName = 'workstation-context';
      const targetServiceAccountName =
        this.k8sWorkstationAppsAuthentikStack
          .dataAutentikRemoteClusterServiceAccountSecret.element.metadata.name;
      const targetNamespace =
        this.k8sWorkstationAppsAuthentikStack.namespace.element.metadata.name;

      const kubeConfig = {
        apiVersion: 'v1',
        kind: 'Config',
        clusters: [
          {
            name: targetClusterName,
            cluster: {
              server: this.config.workstationClusterServer,
              'certificate-authority-data': Fn.base64encode(
                Fn.lookup(
                  this.k8sWorkstationAppsAuthentikStack
                    .dataAutentikRemoteClusterServiceAccountSecret.element.data,
                  'ca.crt',
                ),
              ),
            },
          },
        ],
        users: [
          {
            name: targetServiceAccountName,
            user: {
              token: Fn.lookup(
                this.k8sWorkstationAppsAuthentikStack
                  .dataAutentikRemoteClusterServiceAccountSecret.element.data,
                'token',
              ),
            },
          },
        ],
        contexts: [
          {
            name: targetContextName,
            context: {
              cluster: targetClusterName,
              user: targetServiceAccountName,
              namespace: targetNamespace,
            },
          },
        ],
        'current-context': targetContextName,
      };
      return {
        name: _.startCase(id),
        kubeconfig: JSON.stringify(kubeConfig),
        // @ToDO Home k8s의 CA 체인 설정
        verifySsl: false,
      };
    },
  );
  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sWorkstationAppsAuthentikStack: K8S_Workstation_Apps_Authentik_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Authentik_Resources_Stack.name,
      'K8S OKE Authentik Resources Stack',
    );
    this.addDependency(this.k8sOkeAppsAuthentikStack);
  }
}
