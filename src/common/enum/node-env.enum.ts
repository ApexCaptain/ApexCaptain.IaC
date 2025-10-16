import { InternalServerErrorException } from '@nestjs/common';

export enum NodeEnv {
  DEV = 'DEVELOPMENT',
  TEST = 'TEST',
  PROD = 'PRODUCTION',
}
const nodeEnvEntries = Object.entries(NodeEnv) as [string, NodeEnv][];

export namespace NodeEnv {
  export function getNodeEnvByKey(keyString: string): NodeEnv {
    const nodeEnvEntry = nodeEnvEntries.find(
      ([key]) => key == keyString.toUpperCase(),
    );
    if (!nodeEnvEntry) {
      throw new InternalServerErrorException([
        `Invalid KeyString : "${keyString}". It should be one of the following values.  [${nodeEnvEntries.map(each => each[0]).join(', ')}]`,
      ]);
    }
    return nodeEnvEntry[1];
  }

  export function getCurrentNodeEnv(
    envString: string = process.env.NODE_ENV!!,
  ): NodeEnv {
    if (!envString) {
      throw new InternalServerErrorException([`NODE_ENV is not defined.`]);
    }
    const nodeEnvEntry = nodeEnvEntries.find(
      ([_, value]) => value == envString.toUpperCase(),
    );
    if (!nodeEnvEntry) {
      throw new InternalServerErrorException([
        `Invalid EnvString : "${envString}". It should be one of the following values.  [${nodeEnvEntries.map(each => each[1]).join(', ')}]`,
      ]);
    }

    return nodeEnvEntry[1];
  }

  export function getEnvFilePath(nodeEnv: NodeEnv = getCurrentNodeEnv()) {
    const envString = nodeEnvEntries
      .find(([__, value]) => value == nodeEnv)!![0]
      .toLowerCase();
    return `env/${envString}.env`;
  }
}
