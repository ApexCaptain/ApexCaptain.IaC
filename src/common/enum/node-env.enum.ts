/* eslint-disable no-unused-vars */
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
    if (!nodeEnvEntry)
      throw new InternalServerErrorException([
        `부적절한 KeyString : "${keyString}". 다음의 값 중 하나여야 합니다.  [${nodeEnvEntries.map(each => each[0]).join(', ')}]`,
      ]);
    return nodeEnvEntry[1];
  }

  export function getCurrentNodeEnv(
    envString: string = process.env.NODE_ENV!!,
  ): NodeEnv {
    if (!envString)
      throw new InternalServerErrorException([
        `NODE_ENV가 정의되지 않았습니다.`,
      ]);
    const nodeEnvEntry = nodeEnvEntries.find(
      ([_, value]) => value == envString.toUpperCase(),
    );
    if (!nodeEnvEntry)
      throw new InternalServerErrorException([
        `부적절한 EnvString : "${envString}". 다음의 값 중 하나여야 합니다.  [${nodeEnvEntries.map(each => each[1]).join(', ')}]`,
      ]);

    return nodeEnvEntry[1];
  }

  export function getEnvFilePath(nodeEnv: NodeEnv = getCurrentNodeEnv()) {
    const envString = nodeEnvEntries
      .find(([__, value]) => value == nodeEnv)!![0]
      .toLowerCase();
    return `env/${envString}.env`;
  }
}
