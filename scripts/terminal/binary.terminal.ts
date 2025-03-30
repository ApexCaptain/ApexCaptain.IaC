import {
  AbstractTerminal,
  KubectlCommandTerminal,
  KubectlEndpointTerminal,
  ConsulEndpointTerminal,
  ConsulCommandTerminal,
} from './';

export enum Binary {
  CONSUL = 'consul',
  KUBECTL = 'kubectl',

  // HELM = 'helm',
  // SSH = 'ssh',
}
export class BinaryTerminal extends AbstractTerminal<Binary> {
  protected async generateChoices(): Promise<
    {
      value: Binary;
      name: string;
      description: string;
    }[]
  > {
    return [
      {
        value: Binary.CONSUL,
        name: 'consul',
        description: 'Consul is a tool for managing Consul clusters.',
      },
      {
        value: Binary.KUBECTL,
        name: 'kubectl',
        description:
          'Kubectl is a command-line tool for managing Kubernetes clusters.',
      },
      // {
      //   value: Binary.HELM,
      //   name: 'helm',
      //   description: 'Helm is a package manager for Kubernetes.',
      // },
      // {
      //   value: Binary.SSH,
      //   name: 'ssh',
      //   description:
      //     'SSH is a secure shell protocol for remote login and file transfer.',
      // },
    ];
  }

  constructor() {
    super({
      name: 'Binary',
      description: 'Select a binary to use',
      type: 'argument',
    });
  }
  async execute() {
    const binary = await this.choose();
    switch (binary) {
      case Binary.CONSUL:
        const consulEndpoint = await this.next(new ConsulEndpointTerminal());
        await this.next(
          new ConsulCommandTerminal({ endpoint: consulEndpoint }),
        );
        break;
      case Binary.KUBECTL:
        const kubectlEndpoint = await this.next(new KubectlEndpointTerminal());
        await this.next(
          new KubectlCommandTerminal({ endpoint: kubectlEndpoint }),
        );
        break;
    }
    return binary;
  }
}
