import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { AbstractStack } from '@/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Fn, LocalBackend } from 'cdktf';
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
import {
  VaultProvider,
  VaultProviderConfig,
} from '@lib/terraform/providers/vault/provider';

// Testing vault...
import { Mount } from '@lib/terraform/providers/vault/mount';
import { KvSecretBackendV2 } from '@lib/terraform/providers/vault/kv-secret-backend-v2';
import { KvSecretV2 } from '@lib/terraform/providers/vault/kv-secret-v2';
import { AuthBackend } from '@lib/terraform/providers/vault/auth-backend';
import { GenericEndpoint } from '@lib/terraform/providers/vault/generic-endpoint';
import { Policy } from '@lib/terraform/providers/vault/policy';

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
      // vault: this.provide(
      //   VaultProvider,
      //   'vaultProvider',
      //   () => this.cdktfVaultProviderConfig.shared,
      // ),
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

  // Kubernetes
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

              /**
               * @note
               * - Node의 수를 2개로 제한 해뒀기 때문에 고 가용성 쿼럼을 유지하는데 한계가 있음.
               * - 일단 standalone 모드 사용, 추후 여유가 생기면 ha로 전환
               */
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
            },
          }),
        ],
      },
      {
        host,
        initialVaultPodName,
        containerName,
      },
    ];
  });

  generateDynamicCdktfToken = this.provide(
    DataExternal,
    'generateDynamicCdktfToken',
    () => {
      const tokenKey = 'dynamicCdktfToken';
      const expirationMinutes = 60 * 12;
      return [
        {
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
            TARGET_CDKTF_TOKEN_PATH=/vault/data/cdktf-token.json

            while true; do
                STATUS=$(kubectl get pod $TARGET_POD_NAME -n $TARGET_NAMESPACE -o jsonpath='{.status.phase}')
                if [ "$STATUS" = "Running" ]; then
                    break
                fi
                sleep 5
            done

            execCommand="kubectl exec $TARGET_POD_NAME -c $TARGET_CONTAINER_NAME -n $TARGET_NAMESPACE"

            isVaultInitialized=$($execCommand -i -- sh << EOF
                if vault operator init -status > /dev/null 2>&1; then
                    echo "true"
                else
                    echo "false"
                fi
            EOF
            )

            if [ "$isVaultInitialized" == "true" ]; then
                previousToken=$($execCommand -- cat $TARGET_CDKTF_TOKEN_PATH | jq -r '.auth.client_token')
                isExpired=$(if [ -n "$($execCommand -- find $TARGET_CDKTF_TOKEN_PATH -mmin +${expirationMinutes})" ]; then echo "true"; else echo "false"; fi)
            else
                previousToken=$($execCommand -- vault operator init -format=json | jq -r '.root_token')
                isExpired="true"
            fi

            if [ "$isExpired" == "true" ]; then
                $execCommand -i -- sh << EOF
                  export VAULT_TOKEN=$previousToken
                  vault token create -format=json -orphan -policy=root > $TARGET_CDKTF_TOKEN_PATH
                  vault token revoke $previousToken > /dev/null 2>&1
            EOF
            fi

            newToken=$( $execCommand -- cat $TARGET_CDKTF_TOKEN_PATH | jq -r '.auth.client_token' )

            echo '{"${tokenKey}" : "'$newToken'"}'
        `,
          ],
        },
        { tokenKey },
      ];
    },
  );

  cdktfVaultProviderConfig = this.provide(
    Resource,
    'cdktfVaultProviderConfig',
    () => {
      const vaultProviderConfig: VaultProviderConfig = {
        address: `https://${this.release.shared.host}`,
        token: this.generateDynamicCdktfToken.element.result.lookup(
          this.generateDynamicCdktfToken.shared.tokenKey,
        ),
      };
      return [{}, vaultProviderConfig];
    },
  );

  ///////////////////////////////////////////////////////////////////////

  // Vault
  // testMount = this.provide(Mount, 'testMount', () => ({
  //   path: 'test',
  //   type: 'kv',
  //   options: {
  //     version: '2',
  //   },
  // }));

  // testKvSecretBackendV2 = this.provide(
  //   KvSecretBackendV2,
  //   'testKvSecretBackendV2',
  //   () => ({
  //     mount: this.testMount.element.path,
  //     maxVersions: 5,
  //     deleteVersionAfter: 12600,
  //     casRequired: false,
  //   }),
  // );

  // testKvSecretV2 = this.provide(KvSecretV2, 'testKvSecretV2', () => ({
  //   mount: this.testMount.element.path,
  //   name: 'test',
  //   deleteAllVersions: true,
  //   dataJson: Fn.jsonencode({
  //     some: 'value',
  //   }),
  //   customMetadata: {
  //     maxVersions: 5,
  //     data: {
  //       foo: 'bar',
  //     },
  //   },
  // }));

  // testPolicy = this.provide(Policy, 'testPolicy', () => ({
  //   name: 'test',
  //   policy: dedent`
  //     path "test/data/*" {
  //       capabilities = ["read"]
  //     }
  //   `,
  // }));

  // // OIDC
  // oidcAuthBackend = this.provide(AuthBackend, 'oidcAuthBackend', () => ({
  //   type: 'oidc',
  // }));

  /*
    @ToDo
    1. auth backend / method
    2. secret engine
    3. audit backend
  */

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
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Vault_Stack.name,
      'Vault stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsNfsStack);
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
