import { ServiceV1SpecPort } from '@lib/terraform/providers/kubernetes/service-v1';

export type K8sApplicationMetadata = {
  namespace: string;
  helm: {
    [key: string]: {
      name: string;
      chart: string;
      repository: string;
    };
  };
  services: {
    [key: string]: {
      name: string;
      labels: {
        app: string;
      };
      ports: {
        [key: string]: ServiceV1SpecPort & {
          portBasedIngressPort?: number;
        };
      };
    };
  };
};
