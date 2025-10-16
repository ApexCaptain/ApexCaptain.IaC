import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { TerraformAppService } from '../terraform.app.service';
import { TerraformConfigService } from '../terraform.config.service';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { ActionsSecret } from '@lib/terraform/providers/github/actions-secret';
import { ActionsVariable } from '@lib/terraform/providers/github/actions-variable';
import { DataGithubRepository } from '@lib/terraform/providers/github/data-github-repository';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { DataOciIdentityAvailabilityDomain } from '@lib/terraform/providers/oci/data-oci-identity-availability-domain';
import { DataOciIdentityCompartment } from '@lib/terraform/providers/oci/data-oci-identity-compartment';
import { DataOciIdentityRegionSubscriptions } from '@lib/terraform/providers/oci/data-oci-identity-region-subscriptions';
import { DataOciIdentityTenancy } from '@lib/terraform/providers/oci/data-oci-identity-tenancy';
import { DataOciObjectstorageNamespace } from '@lib/terraform/providers/oci/data-oci-objectstorage-namespace';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { CertRequest } from '@lib/terraform/providers/tls/cert-request';
import { LocallySignedCert } from '@lib/terraform/providers/tls/locally-signed-cert';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { SelfSignedCert } from '@lib/terraform/providers/tls/self-signed-cert';
@Injectable()
export class Project_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
    },
  };

  dataIacGithubRepository = this.provide(
    DataGithubRepository,
    'dataIacGithubRepository',
    () => ({
      name: 'ApexCaptain.IaC',
    }),
  );

  // Shared Istio CA (Root + Intermediate) for multi-cluster mTLS
  // @ToDo 추후 필요시 사용 예정
  /*
  istioRootCa = this.provide(Resource, 'istioRootCa', idPrefix => {
    const rootKey = this.provide(PrivateKey, `${idPrefix}-rootKey`, () => ({
      algorithm: 'RSA',
      rsaBits: 4096,
    }));

    const rootCert = this.provide(
      SelfSignedCert,
      `${idPrefix}-rootCert`,
      () => ({
        privateKeyPem: rootKey.element.privateKeyPem,
        isCaCertificate: true,
        validityPeriodHours: 24 * 3650,
        subject: [{ commonName: 'Istio Root CA', organization: 'Istio' }],
        allowedUses: [
          'cert_signing',
          'crl_signing',
          'key_encipherment',
          'digital_signature',
        ],
      }),
    );

    return [{}, { rootKey, rootCert }];
  });

  istioIntermediateCa = this.provide(
    Resource,
    'istioIntermediateCa',
    idPrefix => {
      const caKey = this.provide(PrivateKey, `${idPrefix}-caKey`, () => ({
        algorithm: 'RSA',
        rsaBits: 4096,
      }));

      const caCsr = this.provide(CertRequest, `${idPrefix}-caCsr`, () => ({
        privateKeyPem: caKey.element.privateKeyPem,
        subject: [{ commonName: 'Istio CA', organization: 'Istio' }],
        ipAddresses: [],
        dnsNames: [],
      }));

      const caCert = this.provide(
        LocallySignedCert,
        `${idPrefix}-caCert`,
        () => ({
          certRequestPem: caCsr.element.certRequestPem,
          caPrivateKeyPem:
            this.istioRootCa.shared.rootKey.element.privateKeyPem,
          caCertPem: this.istioRootCa.shared.rootCert.element.certPem,
          isCaCertificate: true,
          validityPeriodHours: 24 * 365 * 10, // 10 years
          allowedUses: [
            'cert_signing',
            'crl_signing',
            'key_encipherment',
            'digital_signature',
          ],
        }),
      );

      return [{}, { caKey, caCsr, caCert }];
    },
  );

  istioCaBundle = this.provide(Resource, 'istioCaBundle', () => {
    const caCertPem = this.istioIntermediateCa.shared.caCert.element.certPem;
    const caKeyPem =
      this.istioIntermediateCa.shared.caKey.element.privateKeyPem;
    const rootCertPem = this.istioRootCa.shared.rootCert.element.certPem;
    const certChainPem = `${caCertPem}\n${rootCertPem}`;

    return [
      {},
      {
        caCertPem,
        caKeyPem,
        rootCertPem,
        certChainPem,
      },
    ];
  });
  */

  iacGithubRepositoryActionArgs = this.provide(
    Resource,
    'iacGithubRepositoryActionArgs',
    id => {
      const secrets = {
        workflowToken:
          this.globalConfigService.config.terraform.config.providers.github
            .ApexCaptain.token,
      };

      const variables = {};

      Object.entries<string>(secrets).forEach(([key, value]) => {
        const idPostFix = _.snakeCase(key).replace(/_/gi, '-');
        const secretName = _.snakeCase(key).toUpperCase();
        this.provide(ActionsSecret, `${id}-${idPostFix}`, () => ({
          repository: this.dataIacGithubRepository.element.name,
          secretName,
          plaintextValue: value,
        }));
      });

      Object.entries<string>(variables).forEach(([key, value]) => {
        const idPostFix = _.snakeCase(key).replace(/_/gi, '-');
        const variableName = _.snakeCase(key).toUpperCase();
        this.provide(ActionsVariable, `${id}-${idPostFix}`, () => ({
          repository: this.dataIacGithubRepository.element.name,
          variableName,
          value,
        }));
      });

      return {};
    },
  );

  dataRootOciTenancy = this.provide(
    DataOciIdentityTenancy,
    'dataRootOciTenancy',
    () => ({
      tenancyId:
        this.globalConfigService.config.terraform.config.providers.oci
          .ApexCaptain.tenancyOcid,
    }),
  );

  dataOciHomeRegion = this.provide(
    DataOciIdentityRegionSubscriptions,
    'dataOciHomeRegion',
    () => ({
      filter: [
        {
          name: 'is_home_region',
          values: ['true'],
        },
      ],
      tenancyId: this.dataRootOciTenancy.element.id,
    }),
  );

  dataOciRootCompartment = this.provide(
    DataOciIdentityCompartment,
    'dataOciRootCompartment',
    () => ({
      id: this.globalConfigService.config.terraform.config.providers.oci
        .ApexCaptain.tenancyOcid,
    }),
  );

  dataOciAvailabilityDomain = this.provide(
    DataOciIdentityAvailabilityDomain,
    'dataOciAvailabilityDomain',
    () => ({
      compartmentId: this.dataOciRootCompartment.element.id,
      adNumber: 1,
    }),
  );

  dataOciObjectstorageNamespace = this.provide(
    DataOciObjectstorageNamespace,
    'dataOciObjectstorageNamespace',
    () => ({
      compartmentId: this.dataOciRootCompartment.element.id,
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(terraformAppService.cdktfApp, Project_Stack.name, 'Project stack');
  }
}
