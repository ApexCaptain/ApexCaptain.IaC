import { execSync } from 'child_process';
import { Option } from 'commander';
import dedent from 'dedent';
import _ from 'lodash';
import { ExternalProgram, ExternalProgramOutput } from './abstract.external';

interface ExternalManageLonghornNodeOptions {
  kubeconfig?: string;
  httpsProxy?: string;
  namespace: string;
  node: string;
  disks: string;
}

interface ExternalManageLonghornNodeOutput extends ExternalProgramOutput {
  nodeName: string;
  status: 'not-found' | 'already-synced' | 'synced';
}
interface DiskInfo {
  path: string;
  tags: string[];
}

interface DisksSpec {
  [key: string]: DiskInfo;
}

export class ExternalManageLonghornNode extends ExternalProgram<
  ExternalManageLonghornNodeOptions,
  ExternalManageLonghornNodeOutput
> {
  constructor() {
    super(ExternalManageLonghornNode.name, [
      new Option('--kubeconfig <path>', 'The path to the kubeconfig file'),
      new Option('--https-proxy <url>', 'The https proxy url'),
      new Option(
        '--namespace <name>',
        'The namespace of the target longhorn node',
      ).makeOptionMandatory(),
      new Option(
        '--node <name>',
        'The name of the target longhorn node',
      ).makeOptionMandatory(),
      new Option(
        '--disks <json>',
        'The name of the target longhorn disks',
      ).makeOptionMandatory(),
    ]);
  }

  async execute(): Promise<ExternalManageLonghornNodeOutput> {
    const { kubeconfig, httpsProxy, namespace, node, disks } = this.option;

    const kubectlCommand = `kubectl ${kubeconfig ? `--kubeconfig=${kubeconfig}` : ''} ${httpsProxy ? `--proxy=${httpsProxy}` : ''}`;

    const doesNodeExist = (() => {
      const result = execSync(
        dedent`
          ${kubectlCommand} get node.longhorn.io ${node} -n ${namespace} -o json &> /dev/null
        `,
        {
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ).toString();
      return result.length > 0;
    })();
    if (!doesNodeExist) {
      return {
        nodeName: node,
        status: 'not-found',
      };
    }

    const currentSpecDisksInfo: DisksSpec = (() => {
      const result = execSync(
        dedent`
          ${kubectlCommand} get node.longhorn.io ${node} -n ${namespace} -o jsonpath='{.spec.disks}'
        `,
        {
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ).toString();

      return JSON.parse(result);
    })();

    const passedSpecDisksInfo: DisksSpec = JSON.parse(disks);

    const isAlreadySynced = _.isEqual(
      _.mapValues(currentSpecDisksInfo, disk =>
        _.pick(disk, ['path', 'tags', 'diskType']),
      ),
      _.mapValues(passedSpecDisksInfo, disk =>
        _.pick(disk, ['path', 'tags', 'diskType']),
      ),
    );

    if (isAlreadySynced) {
      return {
        nodeName: node,
        status: 'already-synced',
      };
    }

    const disksToDelete = Object.keys(currentSpecDisksInfo).filter(
      eachDiskName => !passedSpecDisksInfo[eachDiskName],
    );

    if (disksToDelete.length) {
      const updatedDisks = {
        ...currentSpecDisksInfo,
        ...Object.fromEntries(
          disksToDelete.map(diskName => [
            diskName,
            {
              ...currentSpecDisksInfo[diskName],
              allowScheduling: false,
            },
          ]),
        ),
      };

      execSync(
        dedent`
        ${kubectlCommand} patch node.longhorn.io ${node} -n ${namespace} --type=json -p='[{"op": "replace", "path": "/spec/disks", "value": ${JSON.stringify(updatedDisks)}}]'
      `,
      );

      const nodeStatus = JSON.parse(
        execSync(
          dedent`
          ${kubectlCommand} get node.longhorn.io ${node} -n ${namespace} -o jsonpath='{.status.diskStatus}'
        `,
          { stdio: ['ignore', 'pipe', 'ignore'] },
        ).toString(),
      );

      const disksWithData = disksToDelete.filter(diskName => {
        const status = nodeStatus[diskName];
        return (
          status.scheduledReplica &&
          Object.keys(status.scheduledReplica).length > 0
        );
      });

      if (disksWithData.length > 0) {
        let isAllMigrationComplete = false;
        let retryCount = 0;
        const maxRetries = 60;

        while (!isAllMigrationComplete && retryCount < maxRetries) {
          const currentStatus = JSON.parse(
            execSync(
              dedent`
              ${kubectlCommand} get node.longhorn.io ${node} -n ${namespace} -o jsonpath='{.status.diskStatus}'
            `,
              { stdio: ['ignore', 'pipe', 'ignore'] },
            ).toString(),
          );

          isAllMigrationComplete = disksWithData.every(diskName => {
            const status = currentStatus[diskName];
            return (
              status.scheduledReplica &&
              Object.keys(status.scheduledReplica).length === 0
            );
          });

          if (!isAllMigrationComplete) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            retryCount++;
          }
        }
      }
    }
    Object.keys(passedSpecDisksInfo).forEach(key => {
      passedSpecDisksInfo[key] = {
        ...passedSpecDisksInfo[key],
        allowScheduling: true,
      } as any;
    });

    execSync(dedent`
        ${kubectlCommand} patch node.longhorn.io ${node} -n ${namespace} --type=json -p='[{"op": "replace", "path": "/spec/disks", "value": ${JSON.stringify(passedSpecDisksInfo)}}]'
      `);

    return {
      nodeName: node,
      status: 'synced',
    };
  }
}
void new ExternalManageLonghornNode().run();
