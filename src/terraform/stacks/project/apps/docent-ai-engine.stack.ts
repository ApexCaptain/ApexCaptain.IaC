import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { Repository } from '@lib/terraform/providers/github/repository';
import { Branch } from '@lib/terraform/providers/github/branch';
import { Resource } from '@lib/terraform/providers/null/resource';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { K8S_Oke_Apps_DocentAiEngine_Stack } from '../../k8s/oke/apps/docent-ai-engine.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { ActionsSecret } from '@lib/terraform/providers/github/actions-secret';
import _ from 'lodash';
import { ActionsVariable } from '@lib/terraform/providers/github/actions-variable';
import { Project_Stack } from '../../project.stack';
import { K8S_Oke_Apps_RolloutTrigger_Stack } from '../../k8s/oke/apps/rollout-trigger.stack';
import { K8S_Oke_Network_Stack } from '../../k8s/oke/network.stack';

@Injectable()
export class Project_Apps_DocentAiEngine_Stack extends AbstractStack {
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
    name: 'IaanCompany.Docent-AI.Engine',
    description: 'Docent AI Engine',
    visibility: 'private',
    autoInit: true,
    lifecycle: {
      preventDestroy: true,
    },
  }));

  developBranch = this.provide(Branch, 'developBranch', () => ({
    repository: this.repository.element.name,
    sourceBranch: 'main',
    branch: 'develop',
    lifecycle: {
      preventDestroy: true,
    },
  }));

  actionArgs = this.provide(Resource, 'actionArgs', id => {
    const containerRegistry =
      this.k8sOkeAppsDocentAiEngineStack.containerRegistry;
    const developer = this.k8sOkeAppsDocentAiEngineStack.developer.shared;

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
        this.k8sOkeAppsDocentAiEngineStack.deployment.element.metadata.name,
      kubernetesRolloutTriggerTargetResourceNamespace:
        this.k8sOkeAppsDocentAiEngineStack.namespace.element.metadata.name,
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
    private readonly k8sOkeAppsDocentAiEngineStack: K8S_Oke_Apps_DocentAiEngine_Stack,
    private readonly k8sOkeAppsRolloutTriggerStack: K8S_Oke_Apps_RolloutTrigger_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Project_Apps_DocentAiEngine_Stack.name,
      'Project Apps Docent AI Engine Stack',
    );
  }
}
