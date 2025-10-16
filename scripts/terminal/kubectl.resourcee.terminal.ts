import { AbstractTerminal, Choice } from './';

export enum KubectlResource {
  PODS = 'pods',
  SERVICES = 'services',
  DEPLOYMENTS = 'deployments',
  INGRESS = 'ingress',
  NODES = 'nodes',
  CONFIGMAPS = 'configmaps',
  CRDS = 'crds',
  GATEWAYS = 'gateway',
  SECRET = 'secret',
  VIRTUALSERVICES = 'virtualservices',
  CLUSTER_ISSUERS = 'clusterissuers',
  CERTIFICATE = 'certificate',
  CERTIFICATE_REQUESTS = 'certificaterequests',
  ORDER = 'order',
  CHALLENGE = 'challenge',
  ENDPOINTS = 'endpoints',
  PV = 'pv',
  PVC = 'pvc',
}

export class KubectlResourceTerminal extends AbstractTerminal<KubectlResource> {
  constructor(private readonly option: { disabled: KubectlResource[] }) {
    super({
      name: 'Kubectl Resource',
      description: 'Select a kubectl resource',
      type: 'argument',
    });
  }

  protected generateChoices(): Promise<Choice<KubectlResource>[]> {
    return Promise.resolve(
      [
        {
          value: KubectlResource.PODS,
          name: 'pods',
          description:
            'A Pod represents a set of running containers in your cluster.',
        },
        {
          value: KubectlResource.SERVICES,
          name: 'services',
          description:
            'A Service is an abstraction which defines a logical set of Pods and a policy by which to access them.',
        },
        {
          value: KubectlResource.DEPLOYMENTS,
          name: 'deployments',
          description:
            'A Deployment provides declarative updates for Pods and ReplicaSets.',
        },
        {
          value: KubectlResource.INGRESS,
          name: 'ingress',
          description:
            'Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster.',
        },
        {
          value: KubectlResource.NODES,
          name: 'nodes',
          description:
            'A Node is a worker machine in Kubernetes, part of a cluster.',
        },
        {
          value: KubectlResource.CONFIGMAPS,
          name: 'configmaps',
          description:
            'A ConfigMap is an API object used to store non-confidential data in key-value pairs.',
        },
        {
          value: KubectlResource.CRDS,
          name: 'crds',
          description:
            'A CustomResourceDefinition (CRD) allows you to define custom resources.',
        },
        {
          value: KubectlResource.GATEWAYS,
          name: 'gateways',
          description:
            'A Gateway describes a load balancer operating at the edge of the mesh receiving incoming or outgoing HTTP/TCP connections.',
        },
        {
          value: KubectlResource.SECRET,
          name: 'secret',
          description:
            'A Secret is an object that contains a small amount of sensitive data such as a password, a token, or a key.',
        },
        {
          value: KubectlResource.VIRTUALSERVICES,
          name: 'virtualservices',
          description:
            'A VirtualService defines the rules that control how requests for a service are routed within an Istio service mesh.',
        },
        {
          value: KubectlResource.CLUSTER_ISSUERS,
          name: 'clusterissuers',
          description:
            'A ClusterIssuer is a resource that represents a certificate authority for issuing certificates.',
        },
        {
          value: KubectlResource.CERTIFICATE,
          name: 'certificate',
          description:
            'A Certificate represents a certificate that can be issued by a ClusterIssuer or Issuer.',
        },
        {
          value: KubectlResource.CERTIFICATE_REQUESTS,
          name: 'certificaterequests',
          description:
            'A CertificateRequest is used to request a signed certificate from a certificate authority.',
        },
        {
          value: KubectlResource.ORDER,
          name: 'order',
          description:
            'An Order represents an order for a certificate from an ACME server.',
        },
        {
          value: KubectlResource.CHALLENGE,
          name: 'challenge',
          description:
            'A Challenge is used to verify ownership of a domain for an ACME order.',
        },
        {
          value: KubectlResource.ENDPOINTS,
          name: 'endpoints',
          description:
            'Endpoints is a collection of endpoints that implement a service.',
        },
        {
          value: KubectlResource.PV,
          name: 'pv',
          description:
            'A PersistentVolume (PV) is a piece of storage in the cluster that has been provisioned by an administrator or dynamically provisioned using Storage Classes.',
        },
        {
          value: KubectlResource.PVC,
          name: 'pvc',
          description:
            'A PersistentVolumeClaim (PVC) is a request for storage by a user.',
        },
      ].filter(each => !this.option.disabled.includes(each.value)),
    );
  }
  async execute() {
    const resource = await this.choose();
    return resource;
  }
}
