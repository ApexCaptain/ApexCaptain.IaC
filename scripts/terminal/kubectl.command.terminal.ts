import {
  KubectlEndpoint,
  AbstractTerminal,
  KubectlResourceTerminal,
  KubectlNamespaceTerminal,
  KubectlPodTerminal,
  KubectlContainerTerminal,
} from './';

enum KubectlCommand {
  GET = 'get',
  LOGS = 'logs',
  EXEC = 'exec',
}

export class KubectlCommandTerminal extends AbstractTerminal<KubectlCommand> {
  constructor(
    private readonly option: {
      endpoint: KubectlEndpoint;
    },
  ) {
    super({
      name: 'Kubectl Command',
      description: 'Select a kubectl command',
      type: 'argument',
    });
  }
  async generateChoices() {
    return [
      {
        value: KubectlCommand.GET,
        name: 'get',
        description: 'Get resources',
      },
      {
        value: KubectlCommand.LOGS,
        name: 'logs',
        description: 'Logs out certain pod or container',
      },
      {
        value: KubectlCommand.EXEC,
        name: 'exec',
        description: 'Execute a command in a container',
      },
    ];
  }
  async execute() {
    const command = await this.choose();
    switch (command) {
      case KubectlCommand.GET:
        const get_resource = await this.next(
          new KubectlResourceTerminal({ disabled: [] }),
        );
        const get_namespace = await this.next(
          new KubectlNamespaceTerminal({ endpoint: this.option.endpoint }),
        );
        await this.runTerminal(
          ['kubectl', `get ${get_resource}`, get_namespace],
          {
            ...process.env,
            KUBECONFIG: this.option.endpoint.kubeConfigFilePath,
            HTTPS_PROXY: this.option.endpoint.socks5ProxyUrl,
          },
        );
      case KubectlCommand.LOGS:
        const logs_namespace = await this.next(
          new KubectlNamespaceTerminal({ endpoint: this.option.endpoint }),
        );
        const logs_pod = await this.next(
          new KubectlPodTerminal({
            endpoint: this.option.endpoint,
            namespace: logs_namespace,
          }),
        );
        const logs_container =
          logs_pod.containers.length > 1
            ? await this.next(
                new KubectlContainerTerminal({
                  pod: logs_pod,
                }),
              )
            : '';
        await this.runTerminal(
          [
            'kubectl',
            `logs ${logs_pod.name}`,
            `-n ${logs_pod.namespace}`,
            logs_container,
          ],
          {
            ...process.env,
            KUBECONFIG: this.option.endpoint.kubeConfigFilePath,
            HTTPS_PROXY: this.option.endpoint.socks5ProxyUrl,
          },
        );
      case KubectlCommand.EXEC:
        const exec_namespace = await this.next(
          new KubectlNamespaceTerminal({ endpoint: this.option.endpoint }),
        );
        const exec_pod = await this.next(
          new KubectlPodTerminal({
            endpoint: this.option.endpoint,
            namespace: exec_namespace,
          }),
        );
        const exec_container =
          exec_pod.containers.length > 1
            ? await this.next(new KubectlContainerTerminal({ pod: exec_pod }))
            : '';
        await this.runTerminal(
          [
            'kubectl',
            `exec ${exec_pod.name}`,
            `-n ${exec_pod.namespace}`,
            exec_container,
          ],
          {
            ...process.env,
            KUBECONFIG: this.option.endpoint.kubeConfigFilePath,
            HTTPS_PROXY: this.option.endpoint.socks5ProxyUrl,
          },
        );
    }

    return command;
  }
}
