import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { AbstractStack } from '@/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_System_Stack } from '../system.stack';
import yaml from 'yaml';
import { K8S_Oke_Apps_IngressController_Stack } from './ingress-controller.stack';
import {
  Cloudflare_Zone_Stack,
  Cloudflare_Record_Stack,
} from '@/terraform/stacks/cloudflare';
import { Resource } from '@lib/terraform/providers/null/resource';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Release } from '@lib/terraform/providers/helm/release';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import { KmsVault } from '@lib/terraform/providers/oci/kms-vault';
import { KmsKey } from '@lib/terraform/providers/oci/kms-key';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { K8S_Oke_Compartment_Stack } from '../compartment.stack';
import dedent from 'dedent';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { ExternalProvider } from '@lib/terraform/providers/external/provider';
import { DataExternal } from '@lib/terraform/providers/external/data-external';
import { VaultProvider } from '@lib/terraform/providers/vault/provider';

@Injectable()
export class K8S_Oke_Apps_Vault_Stack extends AbstractStack {
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
      vault: this.provide(VaultProvider, 'vaultProvider', () => ({
        address: `https://${this.release.shared.host}`,
        token: this.vaultRootToken.shared.rootToken,
      })),

      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      external: this.provide(ExternalProvider, 'externalProvider', () => ({})),
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

  // Cloud Infrastructure
  vaultKmsVault = this.provide(KmsVault, 'vaultKmsVault', id => ({
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    displayName: id,
    vaultType: 'DEFAULT',
    lifecycle: {
      preventDestroy: true,
    },
  }));

  vaultKmsKey = this.provide(KmsKey, 'vaultKmsKey', id => ({
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    displayName: id,
    keyShape: {
      algorithm: 'AES',
      length: 32,
    },
    lifecycle: {
      preventDestroy: true,
    },
    managementEndpoint: this.vaultKmsVault.element.managementEndpoint,
  }));

  // K8S & Helm
  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.vault,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  release = this.provide(Release, 'release', () => {
    const initialVaultPodName = 'vault-0';
    const containerName = 'vault';
    const internalDataPath = '/vault/data';
    const internalInitResultJsonPath = `${internalDataPath}/init-result.json`;
    const host = `${this.cloudflareRecordStack.vaultRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`;

    return [
      {
        name: this.metadata.shared.helm.vault.name,
        chart: this.metadata.shared.helm.vault.chart,
        repository: this.metadata.shared.helm.vault.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            server: {
              dataStorage: {
                enabled: true,
                size: '2Gi',
                storageClass:
                  this.k8sOkeAppsNfsStack.release.shared.storageClassName,
              },
              ingress: {
                enabled: true,
                annotations: {
                  'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
                  'nginx.ingress.kubernetes.io/rewrite-target': '/',
                  'kubernetes.io/ingress.class': 'nginx',
                  'nginx.ingress.kubernetes.io/auth-url':
                    this.k8sOkeAppsOAuth2ProxyStack.release.shared.authUrl,
                  'nginx.ingress.kubernetes.io/auth-signin':
                    this.k8sOkeAppsOAuth2ProxyStack.release.shared.authSignin,
                  'nginx.ingress.kubernetes.io/auth-snippet': dedent`
                    if ($request_uri ~ "/v1") {
                      return 200;
                    }
                  `,
                },
                ingressClassName: 'nginx',
                hosts: [
                  {
                    host,
                  },
                ],
              },

              // @ToDo Node의 수를 2개로 제한 해뒀기 때문에 고 가용성 쿼럼을 유지하는데 한계가 있음.
              // 고로, standalone 모드로 변경, 추후 여유가 생기면 ha로 전환
              standalone: {
                enabled: true,
                config: dedent`
                ui = true

                listener "tcp" {
                  tls_disable = 1
                  address = "[::]:8200"
                  cluster_address = "[::]:8201"
                }

                storage "file" {
                  path = "${internalDataPath}"
                }

                seal "ocikms" {
                  key_id               = "${this.vaultKmsKey.element.id}"
                  crypto_endpoint      = "${this.vaultKmsVault.element.cryptoEndpoint}"
                  management_endpoint  = "${this.vaultKmsVault.element.managementEndpoint}"
                }
              `,
              },

              postStart: [
                '/bin/sh',
                '-c',
                dedent`
                  if [ "$HOSTNAME" != "${initialVaultPodName}" ]; then
                    exit 0
                  fi

                  sleep 10;

                  if ! vault operator init -status; then
                    vault operator init -format=json > ${internalInitResultJsonPath}
                  fi
                `,
              ],
            },
          }),
        ],
      },
      {
        host,
        initialVaultPodName,
        containerName,
        internalInitResultJsonPath,
      },
    ];
  });

  vaultInitResult = this.provide(DataExternal, 'vaultInitResult', () => ({
    dependsOn: [this.release.element],
    program: [
      'bash',
      '-c',
      dedent`
        export HTTPS_PROXY=${this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5}
        export KUBECONFIG=${this.k8sOkeEndpointStack.okeEndpointSource.shared.kubeConfigFilePath}
        TARGET_NAMESPACE=${this.namespace.element.metadata.name}
        TARGET_POD_NAME=${this.release.shared.initialVaultPodName}
        TARGET_CONTAINER_NAME=${this.release.shared.containerName}
        TARGET_INIT_RESULT_JSON_PATH=${this.release.shared.internalInitResultJsonPath}

        while true; do
          STATUS=$(kubectl get pod $TARGET_POD_NAME -n $TARGET_NAMESPACE -o jsonpath='{.status.phase}')
          if [ "$STATUS" = "Running" ]; then
            break
          fi
          sleep 5
        done

        while true; do
          FILE_EXISTS=$(kubectl exec $TARGET_POD_NAME -c $TARGET_CONTAINER_NAME -n $TARGET_NAMESPACE -- sh -c "[ -f $TARGET_INIT_RESULT_JSON_PATH ] && echo 'exists'")
          if [ "$FILE_EXISTS" == "exists" ]; then
            break
          fi
          sleep 5
        done

        INIT_RESULT_FILE_CONTENT=$(kubectl exec $TARGET_POD_NAME -c $TARGET_CONTAINER_NAME -n $TARGET_NAMESPACE -- sh -c "cat $TARGET_INIT_RESULT_JSON_PATH")

        echo $INIT_RESULT_FILE_CONTENT | jq -r '{rootToken: .root_token}'
      `,
    ],
  }));

  vaultRootToken = this.provide(Resource, 'vaultRootToken', () => [
    {},
    {
      rootToken: this.vaultInitResult.element.result.lookup('rootToken'),
    },
  ]);

  // Vault

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly k8sOkeAppsIngressControllerStack: K8S_Oke_Apps_IngressController_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Vault_Stack.name,
      'Vault stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsIngressControllerStack);
    this.addDependency(this.k8sOkeAppsNfsStack);
  }
}
