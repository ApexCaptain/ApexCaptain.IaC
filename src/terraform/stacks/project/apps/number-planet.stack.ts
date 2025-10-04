import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { Resource } from '@lib/terraform/providers/null/resource';
import { Project_Stack } from '../../project.stack';
import { Branch } from '@lib/terraform/providers/github/branch';
import { Repository } from '@lib/terraform/providers/github/repository';
import { ActionsSecret } from '@lib/terraform/providers/github/actions-secret';
import { ActionsVariable } from '@lib/terraform/providers/github/actions-variable';
import _ from 'lodash';
import { ArgocdProvider } from '@lib/terraform/providers/argocd/provider';
import { K8S_Oke_Apps_ArgoCd_Resources_Stack } from '../../k8s/oke/apps/argo-cd.resources.stack';
import { Application } from '@lib/terraform/providers/argocd/application';
import { Cloudflare_Record_Stack } from '../../cloudflare/record.stack';
import { Ocir_Stack } from '../../ocir.stack';
import { K8S_Oke_Apps_GitOps_Stack } from '../../k8s/oke/apps/git-ops.stack';
import { GitOps_Stack } from '../../git-ops.stack';

@Injectable()
export class Project_Apps_NumberPlanet_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
      argoCd: this.provide(
        ArgocdProvider,
        'argoCdProvider',
        () =>
          this.k8sOkeAppsArgoCdResourcesStack
            .deployerAccountArgoCdProviderConfig.shared,
      ),
    },
  };

  numberPlanetRepository = this.provide(
    Repository,
    'numberPlanetRepository',
    () => ({
      name: 'number-planet',
      visibility: 'public',
      autoInit: true,
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  developBranch = this.provide(Branch, 'developBranch', () => ({
    repository: this.numberPlanetRepository.element.name,
    branch: 'develop',
    lifecycle: {
      preventDestroy: true,
    },
  }));

  actionArgs = this.provide(Resource, 'actionArgs', id => {
    const containerRegistry = this.ocirStack.numberPlanetContainerRepository;
    const ciResource = this.ocirStack.ciResource.shared;

    const secrets = {
      workflowToken:
        this.globalConfigService.config.terraform.config.providers.github
          .ApexCaptain.token,

      // OCI
      ociTenancyNamespace:
        this.projectStack.dataOciObjectstorageNamespace.element.namespace,
      ociCliUser: ciResource.user.element.id,
      ociCliUserName: ciResource.user.element.name,
      ociCliTenancy: this.projectStack.dataRootOciTenancy.element.id,
      ociCliFingerprint: ciResource.apiKey.element.fingerprint,
      ociCliKeyContent: ciResource.privateKey.element.privateKeyPem,
      ociCompartmentOcid: containerRegistry.element.compartmentId,
      ociAuthToken: ciResource.authToken.element.token,
    };

    const variables = {
      ociCliRegion:
        this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0)
          .regionName,
      repoName: containerRegistry.element.displayName,
    };

    Object.entries<string>(secrets).forEach(([key, value]) => {
      const idPostFix = _.snakeCase(key).replace(/_/gi, '-');
      const secretName = _.snakeCase(key).toUpperCase();
      this.provide(ActionsSecret, `${id}-${idPostFix}`, () => ({
        repository: this.numberPlanetRepository.element.name,
        secretName,
        plaintextValue: value,
      }));
    });

    Object.entries<string>(variables).forEach(([key, value]) => {
      const idPostFix = _.snakeCase(key).replace(/_/gi, '-');
      const variableName = _.snakeCase(key).toUpperCase();
      this.provide(ActionsVariable, `${id}-${idPostFix}`, () => ({
        repository: this.numberPlanetRepository.element.name,
        variableName,
        value,
      }));
    });

    return {};
  });

  application = this.provide(Application, 'application', () => ({
    metadata: {
      name: 'number-planet',
      namespace: 'argocd',
      annotations: {
        'argocd-image-updater.argoproj.io/image-list': `web=${this.ocirStack.numberPlanetContainerRepository.shared.accessUrl}:~0.0`,
        'argocd-image-updater.argoproj.io/web.update-strategy': 'semver',
        'argocd-image-updater.argoproj.io/web.kustomize.image-name':
          this.ocirStack.numberPlanetContainerRepository.shared.accessUrl,
        'argocd-image-updater.argoproj.io/write-back-method': 'git',
      },
    },
    cascade: true,
    wait: false,
    validate: true,
    spec: {
      destination: {
        name: 'in-cluster',
        namespace:
          this.k8sOkeAppsGitOpsStack.numberPlanet.shared.namespace.element
            .metadata.name,
      },
      source: [
        {
          repoUrl:
            this.gitOpsProjectStack.gitOpsGithubRepository.element.sshCloneUrl,
          path: 'number-planet',
          targetRevision: 'main',
          kustomize: {
            patches: [
              {
                target: {
                  kind: 'Ingress',
                  name: 'number-planet-ingress',
                },
                patch: Fn.jsonencode([
                  {
                    op: 'replace',
                    path: '/spec/rules/0/host',
                    value:
                      this.cloudflareRecordStack.numberPlanetRecord.element
                        .name,
                  },
                ]),
              },
            ],
          },
        },
      ],
      syncPolicy: {
        automated: {
          prune: true,
          selfHeal: true,
          allowEmpty: true,
        },
        retry: {
          limit: '5',
          backoff: {
            duration: '30s',
            maxDuration: '2m',
            factor: '2',
          },
        },
      },
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly ocirStack: Ocir_Stack,
    private readonly k8sOkeAppsArgoCdResourcesStack: K8S_Oke_Apps_ArgoCd_Resources_Stack,
    private readonly k8sOkeAppsGitOpsStack: K8S_Oke_Apps_GitOps_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly gitOpsProjectStack: GitOps_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Project_Apps_NumberPlanet_Stack.name,
      'Project Apps Number Planet Stack',
    );
  }
}
