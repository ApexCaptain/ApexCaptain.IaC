import { spawnSync } from 'child_process';
import fuzzy from 'fuzzy';
import autoComplete, {
  ChoiceOrSeparatorArray,
} from 'inquirer-autocomplete-standalone';

const generateChoices = (env: NodeJS.ProcessEnv) => {
  const choices: ChoiceOrSeparatorArray<string> = (
    JSON.parse(
      spawnSync('kubectl', ['get', 'namespaces', '-o', 'json'], {
        env,
      }).stdout.toString(),
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
      value: each.metadata.name,
      description: `Set namespace to ${each.metadata.name}`,
    }));
  return choices;
};

let choices: ChoiceOrSeparatorArray<string> = [];

export const chooseNamespace = async (env: NodeJS.ProcessEnv) => {
  return autoComplete({
    message: 'Choose available namespace',
    searchText: 'Searching namespaces...',
    source: async input => {
      if (choices.length == 0) choices = generateChoices(env);

      const filtered = fuzzy.filter(input ?? '', Array.from(choices), {
        extract: item =>
          item.type == 'separator' ? item.separator : (item.name ?? item.value),
      });
      return filtered.map(item => item.original);
    },
  });
};
