import { execSync } from 'child_process';
import { AbstractTerminal, KubectlEndpoint } from './';

export type KubectlPod = {
  name: string;
  namespace: string;
  containers: {
    name: string;
  }[];
};

export class KubectlPodTerminal extends AbstractTerminal<KubectlPod> {
  constructor(
    private readonly option: {
      endpoint: KubectlEndpoint;
      namespace: string;
    },
  ) {
    super({
      name: 'Pod',
      description: 'Select a pod',
      type: 'argument',
    });
  }
  async generateChoices() {
    return (
      JSON.parse(
        execSync(`kubectl get pod ${this.option.namespace} -o json`, {
          env: {
            ...process.env,
            KUBECONFIG: this.option.endpoint.kubeConfigFilePath,
            HTTPS_PROXY: this.option.endpoint.socks5ProxyUrl,
          },
        }).toString(),
      ).items as {
        metadata: {
          name: string;
          namespace: string;
        };
        spec: {
          containers: {
            name: string;
          }[];
        };
      }[]
    ).map(each => ({
      name: each.metadata.name,
      value: {
        name: each.metadata.name,
        namespace: each.metadata.namespace,
        containers: each.spec.containers.map(eachContainer => ({
          name: eachContainer.name,
        })),
      },
      description: `Select pod ${each.metadata.name}`,
    }));
  }
  async execute() {
    return this.choose();
  }
}
