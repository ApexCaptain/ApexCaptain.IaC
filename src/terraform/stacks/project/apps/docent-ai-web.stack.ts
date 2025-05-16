import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { Repository } from '@lib/terraform/providers/github/repository';
import { RepositoryCollaborator } from '@lib/terraform/providers/github/repository-collaborator';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import {
  K8S_Oke_Apps_DocentAiWeb_Stack,
  K8S_Oke_Apps_RolloutTrigger_Stack,
} from '../../k8s/oke/apps';
import { ActionsSecret } from '@lib/terraform/providers/github/actions-secret';
import { ActionsVariable } from '@lib/terraform/providers/github/actions-variable';
import _ from 'lodash';
import { K8S_Oke_Network_Stack } from '../../k8s';
import { Project_Stack } from '../../project.stack';

@Injectable()
export class Project_Apps_DocentAiWeb_Stack extends AbstractStack {
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
    },
  };

  repository = this.provide(Repository, 'repository', () => ({
    name: 'IaanCompany.Docent-AI.Web',
    description: 'Docent AI Engine',
    visibility: 'private',
    autoInit: true,
    lifecycle: {
      preventDestroy: true,
    },
  }));

  repositoryCollaboratorGjwoo960101 = this.provide(
    RepositoryCollaborator,
    'repositoryCollaboratorGjwoo960101',
    () => ({
      repository: this.repository.element.name,
      username:
        this.globalConfigService.config.terraform.externalGithubUsers
          .gjwoo960101.githubUsername,
      permission: 'admin',
    }),
  );

  actionArgs = this.provide(Resource, 'actionArgs', id => {
    const containerRegistry = this.k8sOkeAppsDocentAiWebStack.containerRegistry;
    const developer = this.k8sOkeAppsDocentAiWebStack.developer.shared;

    const secrets = {
      workflowToken:
        this.globalConfigService.config.terraform.config.providers.github
          .ApexCaptain.token,

      // OCI
      ociTenancyNamespace:
        this.projectStack.dataOciObjectstorageNamespace.element.namespace,
      ociCliUser: developer.user.element.id,
      ociCliUserName: developer.user.element.name,
      ociCliTenancy: this.projectStack.dataRootOciTenancy.element.id,
      ociCliFingerprint: developer.apiKey.element.fingerprint,
      ociCliKeyContent: developer.privateKey.element.privateKeyPem,
      ociCompartmentOcid: containerRegistry.element.compartmentId,
      ociAuthToken: developer.authToken.element.token,

      // K8S
      kubernetesRolloutTriggerEndpoint: `${
        this.k8sOkeNetworkStack
          .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
          .ipAddress
      }:${
        this.k8sOkeNetworkStack.loadbalancerPortMappings.rolloutTriggerNodePort
          .inbound
      }`,
      kubernetesRolloutTriggerApiResource:
        this.k8sOkeAppsRolloutTriggerStack.deployment.shared.apiResourcePath,
      kubernetesRolloutTriggerXApiKey:
        this.k8sOkeAppsRolloutTriggerStack.xApiKey.element.result,
      kubernetesRolloutTriggerTargetResourceType: 'deployment',
      kubernetesRolloutTriggerTargetResourceName:
        this.k8sOkeAppsDocentAiWebStack.deployment.element.metadata.name,
      kubernetesRolloutTriggerTargetResourceNamespace:
        this.k8sOkeAppsDocentAiWebStack.namespace.element.metadata.name,
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
        repository: this.repository.element.name,
        secretName,
        plaintextValue: value,
      }));
    });

    Object.entries<string>(variables).forEach(([key, value]) => {
      const idPostFix = _.snakeCase(key).replace(/_/gi, '-');
      const variableName = _.snakeCase(key).toUpperCase();
      this.provide(ActionsVariable, `${id}-${idPostFix}`, () => ({
        repository: this.repository.element.name,
        variableName,
        value,
      }));
    });

    return {};
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
    private readonly k8sOkeAppsDocentAiWebStack: K8S_Oke_Apps_DocentAiWeb_Stack,
    private readonly k8sOkeAppsRolloutTriggerStack: K8S_Oke_Apps_RolloutTrigger_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Project_Apps_DocentAiWeb_Stack.name,
      'Project Apps Docent AI Web Stack',
    );
  }
}
