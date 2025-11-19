import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class IstioVirtualService extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
      manifest: {
        metadata: {
          name: string;
          namespace: string;
        };
        spec: {
          hosts: string[];
          gateways?: string[];
          http?: {
            match?: {
              name?: string;
              uri?: {
                exact?: string;
                prefix?: string;
                regex?: string;
              };
              scheme?: {
                exact?: string;
                prefix?: string;
                regex?: string;
              };
              method?: {
                exact?: string;
                prefix?: string;
                regex?: string;
              };
              authority?: {
                exact?: string;
                prefix?: string;
                regex?: string;
              };
              headers?: Record<
                string,
                | { exact?: string; prefix?: string; regex?: string }
                | { exact?: string; prefix?: string; regex?: string }[]
              >;
              port?: number;
              sourceLabels?: Record<string, string>;
              queryParams?: Record<
                string,
                | { exact?: string; prefix?: string; regex?: string }
                | { exact?: string; prefix?: string; regex?: string }[]
              >;
              ignoreUriCase?: boolean;
              withoutHeaders?: Record<
                string,
                | { exact?: string; prefix?: string; regex?: string }
                | { exact?: string; prefix?: string; regex?: string }[]
              >;
              sourceNamespace?: string;
              gateways?: string[];
              statPrefix?: string;
            }[];
            route?: {
              destination: {
                host: string;
                subset?: string;
                port?: {
                  number?: number;
                };
              };
              weight?: number;
              headers?: {
                request?: {
                  set?: Record<string, string>;
                  add?: Record<string, string>;
                  remove?: string[];
                };
                response?: {
                  set?: Record<string, string>;
                  add?: Record<string, string>;
                  remove?: string[];
                };
              };
            }[];
            redirect?: {
              uri?: string;
              authority?: string;
              scheme?: string;
              port?: number;
              derivePort?: 'FROM_PROTOCOL_DEFAULT' | 'FROM_REQUEST_PORT';
              redirectCode?: number;
            };
            directResponse?: {
              status: number;
              body?: {
                string?: string;
                bytes?: string;
              };
            };
            rewrite?: {
              uri?: string;
              authority?: string;
              uriRegexRewrite?: {
                match?: string;
                rewrite?: string;
              };
            };
            timeout?: string;
            retries?: {
              attempts?: number;
              perTryTimeout?: string;
              retryOn?: string;
              retryRemoteLocalities?: boolean;
              retryIgnorePreviousHosts?: boolean;
              backoff?: string;
            };
            fault?: {
              delay?: {
                percentage?: {
                  value?: number;
                };
                percent?: number;
                fixedDelay?: string;
                exponentialDelay?: string;
              };
              abort?: {
                percentage?: {
                  value?: number;
                };
                httpStatus?: number;
                grpcStatus?: string;
                http2Error?: string;
              };
            };
            mirror?: {
              host: string;
              subset?: string;
              port?: {
                number?: number;
              };
            };
            mirrors?: {
              destination: {
                host: string;
                subset?: string;
                port?: {
                  number?: number;
                };
              };
              percentage?: {
                value?: number;
              };
            }[];
            mirror_percent?: number;
            mirrorPercent?: number;
            mirrorPercentage?: {
              value?: number;
            };
            corsPolicy?: {
              allowOrigin?: string[];
              allowOrigins?: {
                exact?: string;
                prefix?: string;
                regex?: string;
              }[];
              allowMethods?: string[];
              allowHeaders?: string[];
              exposeHeaders?: string[];
              maxAge?: string;
              allowCredentials?: boolean;
              unmatchedPreflights?: 'UNSPECIFIED' | 'FORWARD' | 'IGNORE';
            };
            headers?: {
              request?: {
                set?: Record<string, string>;
                add?: Record<string, string>;
                remove?: string[];
              };
              response?: {
                set?: Record<string, string>;
                add?: Record<string, string>;
                remove?: string[];
              };
            };
            delegate?: {
              name?: string;
              namespace?: string;
            };
            priority?: string;
            name?: string;
          }[];
          tls?: {
            match: {
              port?: number;
              sniHosts: string[];
              sourceLabels?: Record<string, string>;
              sourceNamespace?: string;
              gateways?: string[];
              destinationSubnets?: string[];
            }[];
            route?: {
              destination: {
                host: string;
                subset?: string;
                port?: {
                  number?: number;
                };
              };
              weight?: number;
            }[];
          }[];
          tcp?: {
            match?: {
              port?: number;
              sourceLabels?: Record<string, string>;
              sourceNamespace?: string;
              sourceSubnet?: string;
              gateways?: string[];
              destinationSubnets?: string[];
            }[];
            route?: {
              destination: {
                host: string;
                subset?: string;
                port?: {
                  number?: number;
                };
              };
              weight?: number;
            }[];
          }[];
          exportTo?: string[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'networking.istio.io/v1beta1',
        kind: 'VirtualService',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
