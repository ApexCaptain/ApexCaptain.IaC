import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import { K8S_Oke_Compartment_Stack } from '../compartment.stack';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from './authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Oke_Apps_Istio_Gateway_Stack } from './istio.gateway.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import {
  AbstractStack,
  createExpirationInterval,
  IstioAuthorizationPolicy,
  IstioVirtualService,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Application as AuthentikApplication } from '@lib/terraform/providers/authentik/application';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { ProviderProxy } from '@lib/terraform/providers/authentik/provider-proxy';
import { DataExternal } from '@lib/terraform/providers/external/data-external';
import { ExternalProvider } from '@lib/terraform/providers/external/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { KmsKey } from '@lib/terraform/providers/oci/kms-key';
import { KmsVault } from '@lib/terraform/providers/oci/kms-vault';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';
import {
  VaultProvider,
  VaultProviderConfig,
} from '@lib/terraform/providers/vault/provider';

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
      vault: this.provide(
        VaultProvider,
        'vaultProvider',
        () => this.cdktfVaultProviderConfig.shared,
      ),
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      external: this.provide(ExternalProvider, 'externalProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        },
      })),
      authentik: this.provide(
        AuthentikProvider,
        'authentikProvider',
        () =>
          this.k8sOkeAppsAuthentikStack.authentikProviderConfig.shared.config,
      ),
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
  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.vault,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  release = this.provide(Release, 'release', () => {
    const oauthBypassKeyName = 'X-OAuth-Bypass-Key';
    const oauthBypassKeyValue = this.oauthBypassKey.element.result;
    const domain = this.cloudflareRecordOkeStack.vaultRecord.element.name;
    const initialVaultPodName = 'vault-0';
    const serviceName = 'vault';
    const servicePort = 8200;
    const clusterPort = 8201;
    const containerName = 'vault';
    const internalDataPath = '/vault/data';

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
                    address = "[::]:${servicePort}"
                    cluster_address = "[::]:${clusterPort}"
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
        initialVaultPodName,
        domain,
        oauthBypassKeyHeader: {
          name: oauthBypassKeyName,
          value: oauthBypassKeyValue,
        },
        serviceName,
        servicePort,
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
            export KUBECONFIG=${this.k8sOkeK8SStack.kubeConfigFile.element.filename}
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

  oauthBypassKey = this.provide(StringResource, 'argoCdBypassKey', () => ({
    length: 32,
    special: false,
    keepers: {
      expirationDate: createExpirationInterval({
        days: 30,
      }).toString(),
    },
  }));

  virtualService = this.provide(IstioVirtualService, 'virtualService', id => ({
    manifest: {
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        hosts: [this.release.shared.domain],
        gateways: [
          this.k8sOkeAppsIstioGatewayStack.istioIngressGateway.shared
            .gatewayPath,
        ],
        http: [
          {
            route: [
              {
                destination: {
                  host: this.release.shared.serviceName,
                  port: {
                    number: this.release.shared.servicePort,
                  },
                },
              },
            ],
          },
        ],
      },
    },
  }));

  authentikProxyProvider = this.provide(
    ProviderProxy,
    'authentikProxyProvider',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      mode: 'forward_single',
      internalHost: `http://${this.release.shared.serviceName}.${this.namespace.element.metadata.name}.svc.cluster.local`,
      externalHost: `https://${this.release.shared.domain}`,
      authorizationFlow:
        this.k8sOkeAppsAuthentikResourcesStack
          .dataDefaultProviderAuthorizationImplicitConsent.element.id,
      invalidationFlow:
        this.k8sOkeAppsAuthentikResourcesStack.dataDefaultInvalidationFlow
          .element.id,
    }),
  );

  authentikApplication = this.provide(
    AuthentikApplication,
    'authentikApplication',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      slug: _.kebabCase(`${this.metadata.shared.namespace}-${id}`),
      protocolProvider: Fn.tonumber(this.authentikProxyProvider.element.id),
    }),
  );

  authorizationPolicy = this.provide(
    IstioAuthorizationPolicy,
    'authorizationPolicy',
    id => {
      return {
        manifest: {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace:
              this.k8sOkeAppsIstioStack.namespace.element.metadata.name,
          },
          spec: {
            selector: {
              matchLabels: {
                istio:
                  this.k8sOkeAppsIstioStack.istioEastWestGatewayRelease.shared
                    .istioLabel,
              },
            },
            action: 'CUSTOM' as const,
            provider: {
              name: this.k8sOkeAppsIstioStack.istiodRelease.shared
                .okeAuthentikProxyProviderName,
            },
            rules: [
              {
                to: [
                  {
                    operation: {
                      hosts: [this.release.shared.domain],
                    },
                  },
                ],
                when: [
                  {
                    key: `request.headers[${this.release.shared.oauthBypassKeyHeader.name}]`,
                    notValues: [this.release.shared.oauthBypassKeyHeader.value],
                  },
                ],
              },
            ],
          },
        },
      };
    },
  );

  cdktfVaultProviderConfig = this.provide(
    Resource,
    'cdktfVaultProviderConfig',
    () => {
      const vaultProviderConfig: VaultProviderConfig = {
        address: `https://${this.release.shared.domain}`,
        token: this.generateDynamicCdktfToken.element.result.lookup(
          this.generateDynamicCdktfToken.shared.tokenKey,
        ),
        headers: [
          {
            name: this.release.shared.oauthBypassKeyHeader.name,
            value: this.release.shared.oauthBypassKeyHeader.value,
          },
        ],
      };
      return [{}, vaultProviderConfig];
    },
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
    private readonly k8sOkeAppsIstioGatewayStack: K8S_Oke_Apps_Istio_Gateway_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Vault_Stack.name,
      'Vault stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsNfsStack);
  }
}
