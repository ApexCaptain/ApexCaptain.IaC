export type GenericDevicePluginSetting = {
  name: string;
  groups: {
    count?: number;
    paths: {
      path: string;
      mountPath?: string;
    }[];
  }[];
};
