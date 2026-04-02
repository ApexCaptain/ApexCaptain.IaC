import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Apps_Coder_Stack } from './coder.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { K8S_Workstation_Apps_Lxcfs_Stack } from './lxcfs.stack';
import { K8S_Workstation_Plugin_Stack } from '../plugin.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { CoderdProvider } from '@lib/terraform/providers/coderd/provider';
import { Template } from '@lib/terraform/providers/coderd/template';
import { User } from '@lib/terraform/providers/coderd/user';

@Injectable()
export class K8S_Workstation_Apps_Coder_Resources_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      coderd: this.provide(
        CoderdProvider,
        'coderdProvider',
        () =>
          this.k8sWorkstationAppsCoderStack.cdktfCoderdProviderConfig.shared,
      ),
    },
  };

  // Users
  apexCaptainUser = this.provide(User, 'apexCaptainUser', () => ({
    email: this.k8sWorkstationAppsCoderStack.config.users.apexCaptain.email,
    username:
      this.k8sWorkstationAppsCoderStack.config.users.apexCaptain.username,
    loginType: 'github',
    suspended: false,
  }));

  // Templates
  sysboxUbuntuTemplate = this.provide(
    Template,
    'sysboxUbuntuTemplate',
    async id => ({
      name: id,
      displayName: 'Ubuntu with Sysbox-runc',
      description:
        'Sysbox-runc based Ubuntu DevContainer(dind) workspace template',
      icon: '/icon/ubuntu.svg',
      versions: [
        {
          directory: path.join(
            process.cwd(),
            this.k8sWorkstationAppsCoderStack.config
              .templateAssetsRelativeDirPath,
            'sysbox-ubuntu',
            'main',
          ),
          active: true,
          tfVars: [
            {
              name: 'use_kubeconfig',
              value: false.toString(),
            },
            {
              name: 'namespace',
              value:
                this.k8sWorkstationAppsCoderStack.sysboxUbuntuNamespace.element
                  .metadata.name,
            },
            {
              name: 'runtime_class_name',
              value:
                this.k8sWorkstationSystemStack.installSysboxManifest.shared
                  .runimeClassName,
            },
            {
              name: 'storage_class_name',
              value:
                this.k8sWorkstationLonghornStack.longhornSsdStorageClass.element
                  .metadata.name,
            },
            {
              name: 'socks5_proxy_port',
              value: '18420',
            },
            {
              name: 'workspace_directory_name',
              value: 'Workspace',
            },
            {
              name: 'lxcfs_host_mount_path',
              value:
                this.k8sWorkstationAppsLxcfsStack.release.shared
                  .lxcfsHostMountPath,
            },
            {
              name: 'device_plugin_fuse_key',
              value: `${
                this.k8sWorkstationPluginStack.genericDevicePluginDaemonSet
                  .shared.deviceKeyPrefix
              }/${
                this.k8sWorkstationPluginStack.genericDevicePluginDaemonSet
                  .shared.devices.fuse.name
              }`,
            },
            {
              name: 'device_plugin_fuse_count_limit',
              value: '2'.toString(),
            },
          ],
        },
      ],
    }),
  );
  sysboxUbuntuDevTemplate = this.provide(
    Template,
    'sysboxUbuntuDevTemplate',
    async id => ({
      name: id,
      displayName: 'Ubuntu with Sysbox-runc (Dev)',
      description:
        'Sysbox-runc based Ubuntu DevContainer(dind) workspace template',
      icon: '/icon/ubuntu.svg',
      versions: [
        {
          directory: path.join(
            process.cwd(),
            this.k8sWorkstationAppsCoderStack.config
              .templateAssetsRelativeDirPath,
            'sysbox-ubuntu',
            'dev',
          ),
          active: true,
          tfVars: [
            {
              name: 'use_kubeconfig',
              value: false.toString(),
            },
            {
              name: 'namespace',
              value:
                this.k8sWorkstationAppsCoderStack.sysboxUbuntuNamespace.element
                  .metadata.name,
            },
            {
              name: 'runtime_class_name',
              value:
                this.k8sWorkstationSystemStack.installSysboxManifest.shared
                  .runimeClassName,
            },
            {
              name: 'storage_class_name',
              value:
                this.k8sWorkstationLonghornStack.longhornSsdStorageClass.element
                  .metadata.name,
            },
            {
              name: 'socks5_proxy_port',
              value: '18420',
            },
            {
              name: 'workspace_directory_name',
              value: 'Workspace',
            },
            {
              name: 'lxcfs_host_mount_path',
              value:
                this.k8sWorkstationAppsLxcfsStack.release.shared
                  .lxcfsHostMountPath,
            },
            {
              name: 'device_plugin_fuse_key',
              value: `${
                this.k8sWorkstationPluginStack.genericDevicePluginDaemonSet
                  .shared.deviceKeyPrefix
              }/${
                this.k8sWorkstationPluginStack.genericDevicePluginDaemonSet
                  .shared.devices.fuse.name
              }`,
            },
            {
              name: 'device_plugin_fuse_count_limit',
              value: '2'.toString(),
            },
          ],
        },
      ],
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsCoderStack: K8S_Workstation_Apps_Coder_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationAppsLxcfsStack: K8S_Workstation_Apps_Lxcfs_Stack,
    private readonly k8sWorkstationPluginStack: K8S_Workstation_Plugin_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Coder_Resources_Stack.name,
      'K8S Workstation Apps Coder Resources Stack',
    );
    this.addDependency(this.k8sWorkstationAppsCoderStack);
    this.addDependency(this.k8sWorkstationAppsLxcfsStack);
    this.addDependency(this.k8sWorkstationPluginStack);
  }
}
