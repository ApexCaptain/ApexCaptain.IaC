import {
  chooseBinary,
  chooseDataCenter,
  Binary,
  chooseSshNode,
  chooseKubectlCommand,
  DataCenter,
  KubectlCommand,
  chooseNamespace,
  chooseContainer,
  choosePod,
} from './stage';
import { okeEndpointSource } from './generated/K8S_Oke_Endpoint_Stack-okeEndpointSource.source';
import { input } from '@inquirer/prompts';
import { spawnSync } from 'child_process';
import _ from 'lodash';

const executeKubectl = async (dataCenter: DataCenter) => {
  const env = (() => {
    switch (dataCenter) {
      case DataCenter.MICROK8S_HOME:
        return {
          ...process.env,
          KUBECONFIG: process.env.CONTAINER_WORKSTATION_KUBE_CONFIG_FILE_PATH!!,
        };
      case DataCenter.OKE_APEX_CAPTAIN:
        return {
          ...process.env,
          KUBECONFIG: okeEndpointSource.kubeConfigFilePath,
          HTTPS_PROXY: okeEndpointSource.proxyUrl.socks5,
        };
    }
  })();
  const commandArgs: string[] = [];

  const command = await chooseKubectlCommand();
  if (command == KubectlCommand.FREE_TEXT) {
    const freeText = await input({
      message: 'Enter command',
    });
    commandArgs.push(...freeText.split(' '));
  } else {
    commandArgs.push(...command.split(' '));
  }

  // Set Namespace
  let namespace: string | undefined;
  switch (command) {
    case KubectlCommand.GET_PODS:
    case KubectlCommand.GET_SERVICES:
    case KubectlCommand.LOGS:
    case KubectlCommand.EXEC:
    case KubectlCommand.DESCRIBE_POD:
    case KubectlCommand.GET_INGRESS:
    case KubectlCommand.DESCRIBE_SERVICE:
    case KubectlCommand.GET_SECRET:
      namespace = await chooseNamespace(env);
      commandArgs.push('-n', namespace);
  }

  // Set Pod
  let pod: { podName: string; containerNames: string[] } | undefined;
  if (namespace)
    switch (command) {
      case KubectlCommand.LOGS:
      case KubectlCommand.EXEC:
      case KubectlCommand.DESCRIBE_POD:
        pod = await choosePod(env, namespace);
        commandArgs.push(pod.podName);
    }

  // Set Container
  let container: string | undefined;
  if (pod) {
    switch (command) {
      case KubectlCommand.LOGS:
      case KubectlCommand.EXEC:
        container = await chooseContainer(pod.containerNames);
        commandArgs.push('--container', container);
    }
  }

  const additionalArgs = await input({
    message: 'Enter additional arguments',
  });
  commandArgs.push(...additionalArgs.split(' '));

  spawnSync(
    'kubectl',
    commandArgs.filter(eachArg => !_.isEmpty(eachArg)),
    {
      stdio: 'inherit',
      env,
    },
  );
};

const executeSsh = async () => {
  const node = await chooseSshNode(
    okeEndpointSource.nodes.map(eachNode => ({
      ...eachNode,
      keyFilePath: okeEndpointSource.privateKeyFilePath,
      requireProxy: true,
      proxyUrl: okeEndpointSource.proxyUrl.simple,
    })),
  );
  const sshPrompt = await input({
    message: 'Enter prompt to execute',
  });
  spawnSync(
    'ssh',
    [
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      `ProxyCommand nc -X 5 -x ${node.proxyUrl} %h %p`,
      '-i',
      node.keyFilePath,
      '-p',
      node.sshPort.toString(),
      `${node.userName}@${node.privateIp}`,
      sshPrompt,
    ],
    {
      stdio: 'inherit',
    },
  );
};

const runTerminalScript = async () => {
  const binary = await chooseBinary();
  const dataCenter = await chooseDataCenter(binary);

  switch (binary) {
    case Binary.KUBECTL:
      await executeKubectl(dataCenter);
      break;
    case Binary.SSH:
      await executeSsh();
      break;
  }
};
void runTerminalScript();
