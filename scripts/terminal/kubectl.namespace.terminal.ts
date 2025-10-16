import { execSync } from 'child_process';
import { AbstractTerminal, Choice, KubectlEndpoint } from './';

export class KubectlNamespaceTerminal extends AbstractTerminal<string> {
  constructor(
    private readonly option: {
      endpoint: KubectlEndpoint;
    },
  ) {
    super({
      name: 'Kubectl Namespace',
      description: 'Select a kubectl namespace',
      type: 'option',
      flag: 'namespace',
      useShortFlag: true,
    });
  }

  protected async generateChoices(): Promise<Choice<string>[]> {
    return [
      {
        name: 'All_Namespaces',
        value: '--all-namespaces',
        description: 'Use all namespaces',
      },
      ...(
        JSON.parse(
          execSync(`kubectl get namespaces -o json`, {
            env: {
              ...process.env,
              KUBECONFIG: this.option.endpoint.kubeConfigFilePath,
              HTTPS_PROXY: this.option.endpoint.socks5ProxyUrl,
            },
          }).toString(),
        ).items as {
          metadata: {
            name: string;
          };
          status: {
            phase: string;
          };
        }[]
      )
        .filter(each => each.status.phase == 'Active')
        .map(each => ({
          name: each.metadata.name,
          value: `--namespace ${each.metadata.name}`,
          description: `Set namespace to ${each.metadata.name}`,
        })),
    ];
  }
  async execute() {
    return this.choose();
  }
}
