import fs from 'fs';
import path from 'path';
import { KoconutArray } from 'koconut';
import yaml from 'yaml';
import { KubeConfig } from '../src/common/interfaces/kubeconfig.interface';

const mergeKubeConfigScript = async () => {
  const generatedKubeConfigs = fs
    .readdirSync(process.env.KUBE_CONFIG_DIR_NAME!!)
    .filter(eachKubeConfigfile => eachKubeConfigfile.endsWith('.yaml'))
    .map(eachKubeConfigfile => {
      const absolutePath = path.join(
        process.env.KUBE_CONFIG_DIR_NAME!!,
        eachKubeConfigfile,
      );
      return yaml.parse(fs.readFileSync(absolutePath, 'utf8')) as KubeConfig;
    });

  const mergedKubeConfig: KubeConfig = {
    apiVersion: 'v1',
    kind: 'Config',
    preferences: {},
    clusters: await KoconutArray.from(
      generatedKubeConfigs.flatMap(eachKubeConfig => eachKubeConfig.clusters),
    )
      .distinctBy(eachCluster => eachCluster.name)
      .yield(),
    contexts: await KoconutArray.from(
      generatedKubeConfigs.flatMap(eachKubeConfig => eachKubeConfig.contexts),
    )
      .distinctBy(eachContext => eachContext.name)
      .yield(),
    users: await KoconutArray.from(
      generatedKubeConfigs.flatMap(eachKubeConfig => eachKubeConfig.users),
    )
      .distinctBy(eachUser => eachUser.name)
      .yield(),
  };

  const targetKubeConfigFilePath = process.env.KUBECONFIG!!;
  const prevTargetKubeConfig: KubeConfig | undefined = fs.existsSync(
    targetKubeConfigFilePath,
  )
    ? (yaml.parse(
        fs.readFileSync(targetKubeConfigFilePath, 'utf8'),
      ) as KubeConfig)
    : undefined;

  const finalKubeConfig: KubeConfig = {
    ...prevTargetKubeConfig,
    ...mergedKubeConfig,
  };

  // Set default current contest
  if (!finalKubeConfig['current-context']) {
    finalKubeConfig['current-context'] = finalKubeConfig.contexts[0].name;
  } else {
    const currentContext = finalKubeConfig['current-context'];
    const availableContexts = finalKubeConfig.contexts.map(
      eachContext => eachContext.name,
    );
    if (!availableContexts.includes(currentContext)) {
      finalKubeConfig['current-context'] = availableContexts[0];
    }
  }

  fs.writeFileSync(targetKubeConfigFilePath, yaml.stringify(finalKubeConfig));
};
void mergeKubeConfigScript();
