import { AbstractTerminal, KubectlPod } from './';

export class KubectlContainerTerminal extends AbstractTerminal<string> {
  constructor(
    private readonly option: {
      pod: KubectlPod;
    },
  ) {
    super({
      name: 'Container',
      description: 'Select a container',
      type: 'option',
      flag: 'container',
      useShortFlag: true,
    });
  }
  async generateChoices() {
    return [
      {
        value: '',
        name: 'All',
        description: 'Select all containers',
      },
      ...this.option.pod.containers.map(each => ({
        name: each.name,
        value: `-c ${each.name}`,
        description: `Select container ${each.name}`,
      })),
    ];
  }
  async execute() {
    return this.choose();
  }
}
