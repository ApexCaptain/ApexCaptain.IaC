import { execSync } from 'child_process';
import { Option } from 'commander';
import dedent from 'dedent';
import wait from 'wait';
import { ExternalProgram, ExternalProgramOutput } from './abstract.external';

interface ExternalFetchDockerdClientCertOptions {
  kubeconfig?: string;
  httpsProxy?: string;
  namespace: string;
  dockerdPodLabelKey: string;
  dockerdPodLabelValue: string;
  dockerdCertDirPath: string;
}

interface ExternalFetchDockerdClientCertOutput extends ExternalProgramOutput {
  'ca.pem': string;
  'cert.pem': string;
  'key.pem': string;
}
export class ExternalFetchDockerdClientCert extends ExternalProgram<
  ExternalFetchDockerdClientCertOptions,
  ExternalFetchDockerdClientCertOutput
> {
  constructor() {
    super(ExternalFetchDockerdClientCert.name, [
      new Option('--kubeconfig <path>', 'The path to the kubeconfig file'),
      new Option('--https-proxy <url>', 'The https proxy url'),
      new Option(
        '--namespace <name>',
        'The namespace of the target longhorn node',
      ).makeOptionMandatory(),
      new Option(
        '--dockerd-pod-label-key <key>',
        'The key of the dockerd pod label',
      ).makeOptionMandatory(),
      new Option(
        '--dockerd-pod-label-value <value>',
        'The value of the dockerd pod label',
      ).makeOptionMandatory(),
      new Option(
        '--dockerd-cert-dir-path <path>',
        'The path of the dockerd cert directory',
      ).makeOptionMandatory(),
    ]);
  }

  async execute(): Promise<ExternalFetchDockerdClientCertOutput> {
    const {
      kubeconfig,
      httpsProxy,
      namespace,
      dockerdPodLabelKey,
      dockerdPodLabelValue,
      dockerdCertDirPath,
    } = this.option;

    const kubectlCommand = `kubectl ${kubeconfig ? `--kubeconfig=${kubeconfig}` : ''} ${httpsProxy ? `--proxy=${httpsProxy}` : ''}`;

    const targetPodName = await (async () => {
      while (true) {
        try {
          const podName = execSync(
            dedent`
            ${kubectlCommand} get pod \
               -n ${namespace} \
               -l ${dockerdPodLabelKey}=${dockerdPodLabelValue} \
               --field-selector=status.phase=Running \
               -o jsonpath='{.items[0].metadata.name}'
          `,
            {
              stdio: ['ignore', 'pipe', 'ignore'],
            },
          )
            .toString()
            .trim();

          if (!podName) {
            await wait(5000);
            continue;
          }

          execSync(
            dedent`
              ${kubectlCommand} wait \
                -n ${namespace} \
                --for=condition=Ready \
                --timeout=5s \
                pod/${podName}
            `,
            {
              stdio: ['ignore', 'pipe', 'ignore'],
            },
          );
          return podName;
        } catch {
          await wait(5000);
        }
      }
    })();

    const caPem = execSync(
      dedent`
        ${kubectlCommand} exec -n ${namespace} ${targetPodName} -- cat ${dockerdCertDirPath}/client/ca.pem
      `,
      {
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).toString();

    const certPem = execSync(
      dedent`
        ${kubectlCommand} exec -n ${namespace} ${targetPodName} -- cat ${dockerdCertDirPath}/client/cert.pem
      `,
      {
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).toString();

    const keyPem = execSync(
      dedent`
        ${kubectlCommand} exec -n ${namespace} ${targetPodName} -- cat ${dockerdCertDirPath}/client/key.pem
      `,
      {
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).toString();

    return {
      'ca.pem': caPem,
      'cert.pem': certPem,
      'key.pem': keyPem,
    };
  }
}

void new ExternalFetchDockerdClientCert().run();
