import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class MonitoringProbe extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
      manifest: {
        metadata: {
          name: string;
          namespace: string;
          labels?: Record<string, string>;
          annotations?: Record<string, string>;
        };
        spec: {
          jobName?: string;
          interval?: string;
          scrapeTimeout?: string;
          module?: string;
          prober?: {
            url?: string;
            scheme?: 'http' | 'https';
            path?: string;
            proxyUrl?: string;
            timeout?: string;
          };
          targets: {
            staticConfig?: {
              static?: string[];
              labels?: Record<string, string>;
              relabelingConfigs?: {
                sourceLabels?: string[];
                separator?: string;
                targetLabel?: string;
                regex?: string;
                modulus?: number;
                replacement?: string;
                action?:
                  | 'replace'
                  | 'Replace'
                  | 'keep'
                  | 'Keep'
                  | 'drop'
                  | 'Drop'
                  | 'hashmod'
                  | 'HashMod'
                  | 'labelmap'
                  | 'LabelMap'
                  | 'labeldrop'
                  | 'LabelDrop'
                  | 'labelkeep'
                  | 'LabelKeep'
                  | 'lowercase'
                  | 'Lowercase'
                  | 'uppercase'
                  | 'Uppercase'
                  | 'keepequal'
                  | 'KeepEqual'
                  | 'dropequal'
                  | 'DropEqual';
              }[];
            };
            ingress?: {
              namespaceSelector?: {
                matchNames?: string[];
                any?: boolean;
              };
              selector?: {
                matchLabels?: Record<string, string>;
                matchExpressions?: {
                  key: string;
                  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
                  values?: string[];
                }[];
              };
              relabelingConfigs?: {
                sourceLabels?: string[];
                separator?: string;
                targetLabel?: string;
                regex?: string;
                modulus?: number;
                replacement?: string;
                action?:
                  | 'replace'
                  | 'Replace'
                  | 'keep'
                  | 'Keep'
                  | 'drop'
                  | 'Drop'
                  | 'hashmod'
                  | 'HashMod'
                  | 'labelmap'
                  | 'LabelMap'
                  | 'labeldrop'
                  | 'LabelDrop'
                  | 'labelkeep'
                  | 'LabelKeep'
                  | 'lowercase'
                  | 'Lowercase'
                  | 'uppercase'
                  | 'Uppercase'
                  | 'keepequal'
                  | 'KeepEqual'
                  | 'dropequal'
                  | 'DropEqual';
              }[];
            };
          };
          metricRelabelings?: {
            sourceLabels?: string[];
            separator?: string;
            targetLabel?: string;
            regex?: string;
            modulus?: number;
            replacement?: string;
            action?:
              | 'replace'
              | 'Replace'
              | 'keep'
              | 'Keep'
              | 'drop'
              | 'Drop'
              | 'hashmod'
              | 'HashMod'
              | 'labelmap'
              | 'LabelMap'
              | 'labeldrop'
              | 'LabelDrop'
              | 'labelkeep'
              | 'LabelKeep'
              | 'lowercase'
              | 'Lowercase'
              | 'uppercase'
              | 'Uppercase'
              | 'keepequal'
              | 'KeepEqual'
              | 'dropequal'
              | 'DropEqual';
          }[];
          basicAuth?: {
            username?: {
              name: string;
              key: string;
              optional?: boolean;
            };
            password?: {
              name: string;
              key: string;
              optional?: boolean;
            };
          };
          authorization?: {
            type?: string;
            credentials?: {
              name: string;
              key: string;
              optional?: boolean;
            };
          };
          oauth2?: {
            clientId?: {
              configMap?: {
                name: string;
                key: string;
                optional?: boolean;
              };
              secret?: {
                name: string;
                key: string;
                optional?: boolean;
              };
            };
            clientSecret?: {
              name: string;
              key: string;
              optional?: boolean;
            };
            tokenUrl: string;
            scopes?: string[];
            endpointParams?: Record<string, string>;
          };
          bearerTokenSecret?: {
            name: string;
            key: string;
            optional?: boolean;
          };
          tlsConfig?: {
            ca?: {
              configMap?: {
                name: string;
                key: string;
                optional?: boolean;
              };
              secret?: {
                name: string;
                key: string;
                optional?: boolean;
              };
            };
            cert?: {
              configMap?: {
                name: string;
                key: string;
                optional?: boolean;
              };
              secret?: {
                name: string;
                key: string;
                optional?: boolean;
              };
            };
            keySecret?: {
              name: string;
              key: string;
              optional?: boolean;
            };
            insecureSkipVerify?: boolean;
            serverName?: string;
          };
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'monitoring.coreos.com/v1',
        kind: 'Probe',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
