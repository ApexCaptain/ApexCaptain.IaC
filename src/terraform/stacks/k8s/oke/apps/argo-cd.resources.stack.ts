import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Apps_ArgoCd_Stack } from './argo-cd.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { GitOps_Stack } from '@/terraform/stacks/git-ops.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AccountToken } from '@lib/terraform/providers/argocd/account-token';
import { Cluster as ArgocdCluster } from '@lib/terraform/providers/argocd/cluster';
import {
  ArgocdProvider,
  ArgocdProviderConfig,
} from '@lib/terraform/providers/argocd/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_ArgoCd_Resources_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps.argoCd;

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
      argocd: this.provide(ArgocdProvider, 'argocdProvider', () => ({
        serverAddr: `${this.k8sOkeAppsArgoCdStack.argoCdRelease.shared.domain}:443`,
        username: 'admin',
        password: this.config.adminPassword,
        grpcWeb: true,
        headers: [
          `${this.k8sOkeAppsArgoCdStack.argoCdRelease.shared.oauthBypassKeyHeader.name}: ${this.k8sOkeAppsArgoCdStack.argoCdRelease.shared.oauthBypassKeyHeader.value}`,
        ],
      })),
    },
  };

  workstationCluster = this.provide(
    ArgocdCluster,
    'workstationCluster',
    () => ({
      name: 'workstation',
      server: this.config.workstationClusterServer,
      config: {
        bearerToken: Fn.lookup(
          this.gitOpsStack.workstationClusterArgocdManagerServiceAccountToken
            .element.data,
          'token',
        ),
        tlsClientConfig: {
          caData: Fn.lookup(
            this.gitOpsStack.workstationClusterArgocdManagerServiceAccountToken
              .element.data,
            'ca.crt',
          ),
        },
      },
      lifecycle: {
        ignoreChanges: ['config[0].tls_client_config[0].ca_data'],
      },
    }),
  );

  deployerAccountToken = this.provide(
    AccountToken,
    'deployerAccountToken',
    () => ({
      account:
        this.k8sOkeAppsArgoCdStack.argoCdRelease.shared
          .gitOpsDeployerAccountName,
      expiresIn: `${24 * 30}h`,
      renewBefore: '24h',
    }),
  );

  deployerAccountArgoCdProviderConfig = this.provide(
    Resource,
    'deployerAccountArgoCdProviderConfig',
    () => {
      const argoCdProviderConfig: ArgocdProviderConfig = {
        serverAddr: `${this.k8sOkeAppsArgoCdStack.argoCdRelease.shared.domain}:443`,
        authToken: this.deployerAccountToken.element.jwt,
        grpcWeb: true,
        headers: [
          `${this.k8sOkeAppsArgoCdStack.argoCdRelease.shared.oauthBypassKeyHeader.name}: ${this.k8sOkeAppsArgoCdStack.argoCdRelease.shared.oauthBypassKeyHeader.value}`,
        ],
      };
      return [{}, argoCdProviderConfig];
    },
  );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeAppsArgoCdStack: K8S_Oke_Apps_ArgoCd_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly gitOpsStack: GitOps_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ArgoCd_Resources_Stack.name,
      'K8S OKE Argo CD Resources Stack',
    );
    this.addDependency(this.k8sOkeAppsArgoCdStack);
  }
}
