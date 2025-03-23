import autoComplete, {
  ChoiceOrSeparatorArray,
} from 'inquirer-autocomplete-standalone';
import fuzzy from 'fuzzy';

export enum Binary {
  KUBECTL = 'kubectl',
  // HELM = 'helm',
  SSH = 'ssh',
}

const generateChoices = () => {
  const choices: ChoiceOrSeparatorArray<Binary> = [
    {
      value: Binary.KUBECTL,
      description: 'Kubernetes CLI',
    },
    // {
    //   value: Binary.HELM,
    //   description: 'Helm CLI',
    // },
    {
      value: Binary.SSH,
      description: 'SSH CLI',
    },
  ];
  return choices;
};

let choices: ChoiceOrSeparatorArray<Binary> = [];

export const chooseBinary = async () => {
  return await autoComplete({
    message: 'Choose available binary',
    searchText: 'Searching binaries...',
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
