import {
  ReleaseSet,
  ReleaseSetListStruct,
} from '@lib/terraform/providers/helm/release';
import { flatten } from 'flat';
import _ from 'lodash';

export function convertJsonToHelmSet(json: Object) {
  const helmSet: ReleaseSet[] = [];
  const helmSetList: ReleaseSetListStruct[] = [];
  const flattenJson = (target: Object, keyPrefix?: string) => {
    Object.entries(
      flatten(target, {
        maxDepth: 1,
      }) as Object,
    ).forEach(([key, value]) => {
      const mergedKey = `${keyPrefix ? `${keyPrefix}.` : ''}${key}`;
      if (_.isArray(value)) {
        helmSetList.push({
          name: mergedKey,
          value: value,
        });
      } else if (_.isObject(value)) {
        flattenJson(value, mergedKey);
      } else {
        helmSet.push({
          name: mergedKey,
          value: value,
        });
      }
    });
  };
  flattenJson(json);
  return {
    helmSet,
    helmSetList,
  };
}
