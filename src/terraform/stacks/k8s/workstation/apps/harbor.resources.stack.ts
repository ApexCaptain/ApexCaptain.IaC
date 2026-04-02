import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import { K8S_Workstation_Apps_Harbor_Stack } from './harbor.stack';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_Apps_Dockerd_Stack } from './dockerd.stack';
import { AbstractStack, createExpirationInterval } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Project } from '@lib/terraform/providers/harbor/project';
import { HarborProvider } from '@lib/terraform/providers/harbor/provider';
import { RobotAccount } from '@lib/terraform/providers/harbor/robot-account';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import { JobV1 } from '@lib/terraform/providers/kubernetes/job-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';

@Injectable()
export class K8S_Workstation_Apps_Harbor_Resources_Stack extends AbstractStack {
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
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      harbor: this.provide(
        HarborProvider,
        'harborProvider',
        () => this.k8sWorkstationAppsHarborStack.harborProviderConfig.shared,
      ),
    },
  };

  publicDevcontainerFeatures = this.provide(
    Resource,
    'publicDevcontainerFeatures',
    idPrefix => {
      const project = this.provide(Project, `${idPrefix}-project`, id => ({
        name: _.kebabCase(id),
        public: true,
        forceDestroy: true,
        vulnerabilityScanning: true,
        autoSbomGeneration: true,
      }));

      const managerRobotAccountPassword = this.provide(
        StringResource,
        `${idPrefix}-managerRobotAccountPassword`,
        () => ({
          length: 12,
          special: false,
          keepers: {
            expirationDate: createExpirationInterval({
              days: 10,
            }).toString(),
          },
        }),
      );

      const managerRobotAccount = this.provide(
        RobotAccount,
        `${idPrefix}-managerRobotAccount`,
        id => ({
          name: _.kebabCase(id),
          description: 'Manager Robot Account',
          secret: managerRobotAccountPassword.element.result,
          level: 'project',
          permissions: [
            {
              access: [
                {
                  action: 'push',
                  resource: 'repository',
                },
              ],
              kind: 'project',
              namespace: project.element.name,
            },
          ],
        }),
      );

      return [
        {},
        {
          project,
          managerRobotAccount,
          managerRobotAccountPassword: managerRobotAccountPassword,
        },
      ];
    },
  );

  /*
  dockerdClientConfigMap = this.provide(
    ConfigMapV1,
    'dockerdClientConfigMap',
    id => {
      const caPemKey = 'ca.pem';
      const certPemKey = 'cert.pem';
      const keyPemKey = 'key.pem';

      return [
        {
          metadata: {
            name: `${this.k8sWorkstationAppsHarborStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace:
              this.k8sWorkstationAppsHarborStack.namespace.element.metadata
                .name,
          },
          data: {
            [caPemKey]:
              this.k8sWorkstationAppsDockerdStack.fetchDockerdClientCert.element.result.lookup(
                this.k8sWorkstationAppsDockerdStack.fetchDockerdClientCert
                  .shared.caPemKey,
              ),
            [certPemKey]:
              this.k8sWorkstationAppsDockerdStack.fetchDockerdClientCert.element.result.lookup(
                this.k8sWorkstationAppsDockerdStack.fetchDockerdClientCert
                  .shared.certPemKey,
              ),
            [keyPemKey]:
              this.k8sWorkstationAppsDockerdStack.fetchDockerdClientCert.element.result.lookup(
                this.k8sWorkstationAppsDockerdStack.fetchDockerdClientCert
                  .shared.keyPemKey,
              ),
          },
        },
        {
          caPemKey,
          certPemKey,
          keyPemKey,
        },
      ];
    },
  );

  dockerAuthConfigMap = this.provide(ConfigMapV1, 'dockerAuthConfigMap', id => {
    const configJsonKey = 'config.json';
    return [
      {
        metadata: {
          name: `${this.k8sWorkstationAppsHarborStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace:
            this.k8sWorkstationAppsHarborStack.namespace.element.metadata.name,
        },
        data: {
          [configJsonKey]: JSON.stringify({
            auths: {
              [this.k8sWorkstationAppsHarborStack.release.shared.domain]: {
                auth: Fn.base64encode(
                  `${this.publicDevcontainerFeatures.shared.managerRobotAccount.element.fullName}:${this.publicDevcontainerFeatures.shared.managerRobotAccountPassword.element.result}`,
                ),
              },
            },
          }),
        },
      },
      { configJsonKey },
    ];
  });

  publicDevcontainerFeaturesAssetsZipConfigMap = this.provide(
    ConfigMapV1,
    'publicDevcontainerFeaturesAssetsZipConfigMap',
    async id => {
      const configMapName = `${this.k8sWorkstationAppsHarborStack.metadata.shared.namespace}-${_.kebabCase(id)}`;
      const assetsDirPath = path.join(
        process.cwd(),
        'assets/static/devContainer-features-builder/public',
      );
      const assetsZipFilePath = path.join(`/tmp/${configMapName}.zip`);
      if (fs.existsSync(assetsZipFilePath)) {
        fs.unlinkSync(assetsZipFilePath);
      }
      execSync(`zip -r "${assetsZipFilePath}" .`, {
        cwd: assetsDirPath,
      });
      const dataKeyAssetsZip = 'assets.zip';

      return [
        {
          metadata: {
            name: configMapName,
            namespace:
              this.k8sWorkstationAppsHarborStack.namespace.element.metadata
                .name,
          },
          binaryData: {
            [dataKeyAssetsZip]: Fn.filebase64(assetsZipFilePath),
          },
        },
        { dataKeyAssetsZip },
      ];
    },
  );

  // k exec -it job/harbor-public-devcontainer-features-build-job -n harbor -- /bin/sh
  publicDevcontainerFeaturesBuildJob = this.provide(
    JobV1,
    'publicDevcontainerFeaturesBuildJob',
    id => {
      const dockerdClientCertDirPath = '/certs/client';
      const assetsZipFilePath = '/tmp/assets.zip';
      return {
        metadata: {
          name: `${this.k8sWorkstationAppsHarborStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace:
            this.k8sWorkstationAppsHarborStack.namespace.element.metadata.name,
        },
        spec: {
          template: {
            metadata: {
              name: `${this.k8sWorkstationAppsHarborStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            },
            spec: {
              container: [
                {
                  name: 'test',
                  image: 'docker:29.2.1-cli-alpine3.23',
                  command: [
                    '/bin/sh',
                    '-c',
                    dedent`
                      apk add --update nodejs npm
                      npm install -g @devcontainers/cli
                      unzip ${assetsZipFilePath} -d /root/assets
                      
                      docker info
                    `,
                  ],
                  env: [
                    {
                      name: 'DOCKER_CERT_PATH',
                      value: dockerdClientCertDirPath,
                    },
                    {
                      name: 'DOCKER_TLS_VERIFY',
                      value: '1',
                    },
                    {
                      name: 'DOCKER_HOST',
                      value:
                        this.k8sWorkstationAppsDockerdStack.deployment.shared
                          .internalDockerdTcpHostPath,
                    },
                  ],
                  volumeMount: [
                    {
                      name: this.dockerdClientConfigMap.element.metadata.name,
                      mountPath: dockerdClientCertDirPath,
                    },
                    {
                      name: this.dockerAuthConfigMap.element.metadata.name,
                      mountPath: '/root/.docker/config.json',
                      subPath: this.dockerAuthConfigMap.shared.configJsonKey,
                    },
                    {
                      name: this.publicDevcontainerFeaturesAssetsZipConfigMap
                        .element.metadata.name,
                      mountPath: assetsZipFilePath,
                      subPath:
                        this.publicDevcontainerFeaturesAssetsZipConfigMap.shared
                          .dataKeyAssetsZip,
                    },
                  ],
                },
              ],
              volume: [
                {
                  name: this.dockerdClientConfigMap.element.metadata.name,
                  configMap: {
                    name: this.dockerdClientConfigMap.element.metadata.name,
                  },
                },
                {
                  name: this.dockerAuthConfigMap.element.metadata.name,
                  configMap: {
                    name: this.dockerAuthConfigMap.element.metadata.name,
                    items: [
                      {
                        key: this.dockerAuthConfigMap.shared.configJsonKey,
                        path: this.dockerAuthConfigMap.shared.configJsonKey,
                      },
                    ],
                  },
                },
                {
                  name: this.publicDevcontainerFeaturesAssetsZipConfigMap
                    .element.metadata.name,
                  configMap: {
                    name: this.publicDevcontainerFeaturesAssetsZipConfigMap
                      .element.metadata.name,
                    items: [
                      {
                        key: this.publicDevcontainerFeaturesAssetsZipConfigMap
                          .shared.dataKeyAssetsZip,
                        path: this.publicDevcontainerFeaturesAssetsZipConfigMap
                          .shared.dataKeyAssetsZip,
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      };
    },
  );
  */

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsHarborStack: K8S_Workstation_Apps_Harbor_Stack,
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationAppsDockerdStack: K8S_Workstation_Apps_Dockerd_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Harbor_Resources_Stack.name,
      'K8S Workstation Apps Harbor Resources Stack',
    );
    this.addDependency(this.k8sWorkstationAppsHarborStack);
  }
}
