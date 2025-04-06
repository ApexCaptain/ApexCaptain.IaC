import { Injectable } from '@nestjs/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AbstractStack } from '@/common';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_System_Stack } from '../system.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Fn, LocalBackend } from 'cdktf';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { CoreVolume } from '@lib/terraform/providers/oci/core-volume';
import { CoreVolumeBackupPolicy } from '@lib/terraform/providers/oci/core-volume-backup-policy';
import { CoreVolumeBackupPolicyAssignment } from '@lib/terraform/providers/oci/core-volume-backup-policy-assignment';
import { Project_Stack } from '@/terraform/stacks/project.stack';
import { K8S_Oke_Compartment_Stack } from '../compartment.stack';
import { PersistentVolumeV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-v1';
import _ from 'lodash';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { PodV1 } from '@lib/terraform/providers/kubernetes/pod-v1';

// https://rohitchaware.medium.com/static-volume-provisioning-in-oracle-container-engine-for-kubernetes-oke-with-container-storage-a63846a18aeb
// https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner

@Injectable()
export class K8S_Oke_Apps_Nfs_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
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
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        },
      })),
    },
  };

  nfsCoreVolume = this.provide(CoreVolume, 'nfsCoreVolume', id => ({
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    availabilityDomain:
      this.projectStack.dataOciAvailabilityDomain.element.name,
    sizeInGbs: '100',
    displayName: id,
  }));

  /**
   * @Schedule_1: 매주 일요일 2시에 증분 백업, 3주 동안 보관
   * @Schedule_2: 매월 1일 3시에 전체 백업, 2달 동안 보관
   */
  nfsCoreVolumeBackupPolicy = this.provide(
    CoreVolumeBackupPolicy,
    'nfsCoreVolumeBackupPolicy',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      schedules: [
        {
          backupType: 'INCREMENTAL',
          period: 'ONE_WEEK',
          retentionSeconds: 60 * 60 * 24 * 7 * 3,
          dayOfWeek: 'SUNDAY',
          hourOfDay: 2,
          offsetSeconds: 0,
          offsetType: 'STRUCTURED',
          timeZone: 'REGIONAL_DATA_CENTER_TIME',
        },
        {
          backupType: 'FULL',
          period: 'ONE_MONTH',
          retentionSeconds: 60 * 60 * 24 * 30 * 2,
          dayOfMonth: 1,
          hourOfDay: 3,
          offsetSeconds: 0,
          offsetType: 'STRUCTURED',
          timeZone: 'REGIONAL_DATA_CENTER_TIME',
        },
      ],
    }),
  );

  nfsCoreVolumeBackupPolicyAssignment = this.provide(
    CoreVolumeBackupPolicyAssignment,
    'nfsCoreVolumeBackupPolicyAssignment',
    () => ({
      assetId: this.nfsCoreVolume.element.id,
      policyId: this.nfsCoreVolumeBackupPolicy.element.id,
    }),
  );

  nfsPersistentVolume = this.provide(
    PersistentVolumeV1,
    'nfsPersistentVolume',
    id => ({
      metadata: {
        name: _.kebabCase(id),
        annotations: {
          'pv.kubernetes.io/provisioned-by': 'blockvolume.csi.oraclecloud.com',
        },
      },
      spec: [
        {
          nodeAffinity: {
            required: {
              nodeSelectorTerm: [
                {
                  matchExpressions: [
                    {
                      key: 'failure-domain.beta.kubernetes.io/zone',
                      operator: 'In',
                      values: [
                        Fn.element(
                          Fn.split(
                            ':',
                            this.projectStack.dataOciAvailabilityDomain.element
                              .name,
                          ),
                          1,
                        ),
                      ],
                    },
                  ],
                },
              ],
            },
          },
          storageClassName: 'oci-bv',
          persistentVolumeReclaimPolicy: 'Retain',
          capacity: {
            storage: `${this.nfsCoreVolume.element.sizeInGbs}Gi`,
          },
          accessModes: ['ReadWriteOnce'],
          persistentVolumeSource: {
            csi: {
              driver: 'blockvolume.csi.oraclecloud.com',
              volumeHandle: this.nfsCoreVolume.element.id,
              fsType: 'ext4',
            },
          },
        },
      ],
    }),
  );

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.nfs,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  persistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'persistentVolumeClaim',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        volumeName: this.nfsPersistentVolume.element.metadata.name,
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: `${this.nfsCoreVolume.element.sizeInGbs}Gi`,
          },
        },
        storageClassName: 'oci-bv',
      },
    }),
  );

  // testPod = this.provide(PodV1, 'testPod', () => ({
  //   metadata: {
  //     name: 'test-pod',
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     container: [
  //       {
  //         name: 'test-container',
  //         image: 'busybox:latest',
  //         command: ['/bin/sh', '-c', 'while true; do sleep 3600; done'],
  //         volumeMount: [
  //           {
  //             name: this.nfsPersistentVolumeClaim.element.metadata.name,
  //             mountPath: '/test/data',
  //           },
  //         ],
  //       },
  //     ],
  //     volume: [
  //       {
  //         name: this.nfsPersistentVolumeClaim.element.metadata.name,
  //         persistentVolumeClaim: {
  //           claimName: this.nfsPersistentVolumeClaim.element.metadata.name,
  //         },
  //       },
  //     ],
  //   },
  // }));

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Nfs_Stack.name,
      'Nfs for OKE k8s',
    );
  }
}
