import autoComplete, {
  ChoiceOrSeparatorArray,
} from 'inquirer-autocomplete-standalone';
import fuzzy from 'fuzzy';
import { Binary } from './1_binary.choice';
export enum DataCenter {
  OKE_APEX_CAPTAIN = 'oke',
  MICROK8S_HOME = 'home',
}

const generateChoices = () => {
  const choices: ChoiceOrSeparatorArray<DataCenter> = [
    {
      value: DataCenter.OKE_APEX_CAPTAIN,
      description: 'Oracle Kubernetes Engine (OKE) Apex Captain',
    },
    {
      value: DataCenter.MICROK8S_HOME,
      description: 'MicroK8s Home',
    },
  ];
  return choices;
};

let choices: ChoiceOrSeparatorArray<DataCenter> = [];

export const chooseDataCenter = async (binary: Binary) => {
  return await autoComplete({
    message: 'Choose available data center',
    searchText: 'Searching data centers...',
    source: async input => {
      if (choices.length == 0)
        choices = generateChoices().filter(eachChoice => {
          if (binary === Binary.SSH) {
            return (
              eachChoice.type == 'separator' ||
              eachChoice.value !== DataCenter.MICROK8S_HOME
            );
          }
          return true;
        });

      const filtered = fuzzy.filter(input ?? '', Array.from(choices), {
        extract: item =>
          item.type == 'separator' ? item.separator : (item.name ?? item.value),
      });
      return filtered.map(item => item.original);
    },
  });
};
