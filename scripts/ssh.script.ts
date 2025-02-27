import { spawnSync } from 'child_process';
import { Option, program } from 'commander';
import { TargetK8sEndpoint } from './enum';
import { okeEndpointSource } from './generated/K8S_Oke_Endpoint_Stack-okeEndpointSource';

const command = program
  .addOption(
    new Option('-t --target <type>', 'Targeting Cluster').choices(
      Object.values(TargetK8sEndpoint),
    ),
  )
  .addOption(new Option('-i --index <number>', 'Index of the node').default(0))
  .allowExcessArguments()
  .parse(process.argv);

const options = command.opts<{ target: TargetK8sEndpoint; index: number }>();

const sshRenderParams: {
  [key in TargetK8sEndpoint]: {
    requireProxy: boolean;
    proxyUrl?: string;
    privateKeyFilePath: string;
    nodes: { userName: string; privateIp: string; sshPort: number }[];
  };
} = {
  [TargetK8sEndpoint.OKE_APEX_CAPTAIN]: {
    requireProxy: true,
    proxyUrl: okeEndpointSource.proxyUrl.simple,
    privateKeyFilePath: okeEndpointSource.privateKeyFilePath,
    nodes: okeEndpointSource.nodes,
  },
};

const ssh = async () => {
  const selectedParams = sshRenderParams[options.target];
  const targetNode = selectedParams.nodes[options.index];
  spawnSync(
    'ssh',
    [
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      `ProxyCommand nc -X 5 -x ${selectedParams.proxyUrl} %h %p`,
      '-i',
      selectedParams.privateKeyFilePath,
      '-p',
      targetNode.sshPort.toString(),
      `${targetNode.userName}@${targetNode.privateIp}`,
    ],
    { stdio: 'inherit' },
  );
};
void ssh();
