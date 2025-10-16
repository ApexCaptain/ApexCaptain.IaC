import fuzzy from 'fuzzy';
import autoComplete, {
  ChoiceOrSeparatorArray,
} from 'inquirer-autocomplete-standalone';

export enum KubectlCommand {
  FREE_TEXT = 'free-text',
  GET_PODS = 'get pods',
  GET_PODS_ALL_NAMESPACES = 'get pods --all-namespaces',
  GET_SERVICES = 'get services',
  GET_SERVICES_ALL_NAMESPACES = 'get services --all-namespaces',
  GET_INGRESS = 'get ingress',
  GET_INGRESS_ALL_NAMESPACES = 'get ingress --all-namespaces',

  GET_NODES = 'get nodes',

  GET_SECRET = 'get secret',

  LOGS = 'logs',
  EXEC = 'exec',

  DESCRIBE_POD = 'describe pod',
  DESCRIBE_SERVICE = 'describe service',
}

const generateChoices = () => {
  const choices: ChoiceOrSeparatorArray<KubectlCommand> = [
    {
      value: KubectlCommand.FREE_TEXT,
      description: 'Manual input',
    },
    {
      value: KubectlCommand.GET_PODS,
      description: 'Get pods',
    },
    {
      value: KubectlCommand.GET_PODS_ALL_NAMESPACES,
      description: 'Get pods --all-namespaces',
    },
    {
      value: KubectlCommand.GET_SERVICES,
      description: 'Get services',
    },
    {
      value: KubectlCommand.GET_SERVICES_ALL_NAMESPACES,
      description: 'Get services --all-namespaces',
    },
    {
      value: KubectlCommand.GET_INGRESS,
      description: 'Get ingress',
    },
    {
      value: KubectlCommand.GET_INGRESS_ALL_NAMESPACES,
      description: 'Get ingress --all-namespaces',
    },
    {
      value: KubectlCommand.GET_NODES,
      description: 'Get nodes',
    },
    {
      value: KubectlCommand.GET_SECRET,
      description: 'Get secret',
    },
    {
      value: KubectlCommand.LOGS,
      description: 'Logs',
    },
    {
      value: KubectlCommand.EXEC,
      description: 'Execution',
    },
    {
      value: KubectlCommand.DESCRIBE_POD,
      description: 'Describe pod',
    },
    {
      value: KubectlCommand.DESCRIBE_SERVICE,
      description: 'Describe service',
    },
  ];
  return choices;
};

let choices: ChoiceOrSeparatorArray<KubectlCommand> = [];

export const chooseKubectlCommand = async () => {
  return autoComplete({
    message: 'Choose available kubectl command',
    searchText: 'Searching kubectl commands...',
    source: async input => {
      if (choices.length == 0) choices = generateChoices();
      const filtered = fuzzy.filter(input ?? '', Array.from(choices), {
        extract: item =>
          item.type == 'separator' ? item.separator : (item.name ?? item.value),
      });
      return filtered.map(item => item.original);
    },
  });
};
