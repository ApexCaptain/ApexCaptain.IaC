import { LocalExecProvisioner } from 'cdktf';

export function createSetEnvExecutionProvisioner({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  const setEnvExecutionProvisioner: LocalExecProvisioner = {
    type: 'local-exec',
    command: [
      `sudo sed -i '/^export ${name}=/d' ~/.bashrc`,
      `sudo echo 'export ${name}="${value}"' >> ~/.bashrc`,
    ].join(' &&'),
  };
  return setEnvExecutionProvisioner;
}
