import { spawnSync } from 'child_process';
import fuzzy from 'fuzzy';
import autoComplete, {
  ChoiceOrSeparatorArray,
} from 'inquirer-autocomplete-standalone';

const generateChoices = (env: NodeJS.ProcessEnv, namespace: string) => {
  const choices: ChoiceOrSeparatorArray<{
    podName: string;
    containerNames: string[];
  }> = (
    JSON.parse(
      spawnSync('kubectl', ['get', 'pods', '-n', namespace, '-o', 'json'], {
        env,
      }).stdout.toString(),
    ).items as {
      metadata: {
        name: string;
      };
      spec: {
        containers: {
          name: string;
        }[];
      };
    }[]
  ).map(each => ({
    name: each.metadata.name,
    value: {
      podName: each.metadata.name,
      containerNames: each.spec.containers.map(
        eachContainer => eachContainer.name,
      ),
    },
    description: `Set pod to ${each.metadata.name}`,
  }));
  return choices;
};
let choices: ChoiceOrSeparatorArray<{
  podName: string;
  containerNames: string[];
}> = [];

export const choosePod = async (env: NodeJS.ProcessEnv, namespace: string) => {
  return autoComplete({
    message: 'Choose available pod',
    searchText: 'Searching pods...',
    source: async input => {
      if (choices.length == 0) choices = generateChoices(env, namespace);

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
