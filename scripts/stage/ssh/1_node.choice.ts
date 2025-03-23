import autoComplete, {
  ChoiceOrSeparatorArray,
} from 'inquirer-autocomplete-standalone';
import fuzzy from 'fuzzy';

type SshNode = {
  keyFilePath: string;
  userName: string;
  sshPort: number;
  privateIp: string;
  requireProxy: boolean;
  proxyUrl?: string;
};

const generateChoices = (nodes: SshNode[]) => {
  const choices: ChoiceOrSeparatorArray<SshNode> = nodes.map(eachNode => ({
    name: eachNode.privateIp,
    value: eachNode,
    description: `SSH Endpoint to ${eachNode.privateIp}`,
  }));
  return choices;
};

export const chooseSshNode = async (nodes: SshNode[]) => {
  return await autoComplete({
    message: 'Choose available node',
    searchText: 'Searching nodes...',
    source: async input => {
      const choices = generateChoices(nodes);
      const filtered = fuzzy.filter(input ?? '', Array.from(choices), {
        extract: item =>
          item.type == 'separator'
            ? item.separator
            : (item.name ?? JSON.stringify(item.value)),
      });
      return filtered.map(item => item.original);
    },
  });
};
