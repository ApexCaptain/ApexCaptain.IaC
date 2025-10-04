import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Apps_ArgoCd_Stack } from './argo-cd.stack';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import {
  ArgocdProvider,
  ArgocdProviderConfig,
} from '@lib/terraform/providers/argocd/provider';
import { AccountToken } from '@lib/terraform/providers/argocd/account-token';
import { Resource } from '@lib/terraform/providers/null/resource';
import _ from 'lodash';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';

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
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ArgoCd_Resources_Stack.name,
      'K8S OKE Argo CD Resources Stack',
    );
    this.addDependency(this.k8sOkeAppsArgoCdStack);
  }
}
