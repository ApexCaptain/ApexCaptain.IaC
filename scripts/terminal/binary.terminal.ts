import {
  AbstractTerminal,
  KubectlCommandTerminal,
  KubectlEndpointTerminal,
} from './';

export enum Binary {
  KUBECTL = 'kubectl',
  // HELM = 'helm',
  SSH = 'ssh',
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
      {
        value: Binary.SSH,
        name: 'ssh',
        description:
          'SSH is a secure shell protocol for remote login and file transfer.',
      },
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
      case Binary.KUBECTL:
        const endpoint = await this.next(new KubectlEndpointTerminal());
        await this.next(new KubectlCommandTerminal({ endpoint }));
        break;
    }
    return binary;
  }
}
