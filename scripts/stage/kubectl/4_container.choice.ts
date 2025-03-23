import { spawnSync } from 'child_process';
import autoComplete, {
  ChoiceOrSeparatorArray,
} from 'inquirer-autocomplete-standalone';
import fuzzy from 'fuzzy';

const generateChoices = (containerNames: string[]) => {
  const choices: ChoiceOrSeparatorArray<string> = containerNames.map(each => ({
    name: each,
    value: each,
    description: `Set container to ${each}`,
  }));
  return choices;
};
let choices: ChoiceOrSeparatorArray<string> = [];

export const chooseContainer = async (containerNames: string[]) => {
  return await autoComplete({
    message: 'Choose available container',
    searchText: 'Searching containers...',
    source: async input => {
      if (choices.length == 0) choices = generateChoices(containerNames);

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
