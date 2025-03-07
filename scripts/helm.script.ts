import { spawnSync } from 'child_process';
import { Option, program } from 'commander';
import { TargetK8sEndpoint } from './enum';
import { okeEndpointSource } from './generated/K8S_Oke_Endpoint_Stack-okeEndpointSource.source';

const command = program
  .addOption(
    new Option('-t --target <type>').choices(Object.values(TargetK8sEndpoint)),
  )
  .allowExcessArguments()
  .allowUnknownOption()
  .parse(process.argv);

const options = command.opts<{ target: TargetK8sEndpoint }>();

const kubectlRenderParams: {
  [key in TargetK8sEndpoint]: {
    requireProxy: boolean;
    proxyUrl?: string;
    kubeConfigFilePath: string;
  };
} = {
  [TargetK8sEndpoint.OKE_APEX_CAPTAIN]: {
    requireProxy: true,
    proxyUrl: okeEndpointSource.proxyUrl.socks5,
    kubeConfigFilePath: okeEndpointSource.kubeConfigFilePath,
  },
};

const helm = async () => {
  const selectedParams = kubectlRenderParams[options.target];

  spawnSync(
    'helm',
    ['--kubeconfig', selectedParams.kubeConfigFilePath, ...command.args],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        HTTPS_PROXY: selectedParams.requireProxy
          ? selectedParams.proxyUrl
          : undefined,
      },
    },
  );
};
void helm();
