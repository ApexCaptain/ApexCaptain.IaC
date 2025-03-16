import {
  DeepPartial,
  DeepRequired,
  K8sApplicationMetadata,
  PartiallyRequired,
} from '../types';

export function createK8sApplicationMetadata<
  T extends PartiallyRequired<DeepPartial<K8sApplicationMetadata>, 'namespace'>,
>(options: T) {
  return options as DeepRequired<T>;
}
