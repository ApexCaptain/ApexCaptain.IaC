/**
 *
 * @param option.verb
 * The verbs are listed in order of least amount of ability to most.
 * The exact meaning of a each verb depends on which resource-type it's paired with.
 * Tables provided in each service-specific policy reference show the API operations
 * covered by each combination of verb and resource-type.
 * @See https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/policyreference.htm#Verbs
 *
 * @param option.resourceType
 * Common resource types.
 * @See https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/policyreference_topic-ResourceTypes.htm
 *
 * @returns Generated policy statement
 */
export const createOciPolicyStatement = (option: {
  subject:
    | 'any-user'
    | {
        type: 'group' | 'group id' | 'dynamic-group' | 'dynamic-group id';
        targets: string[];
      };

  verb: 'inspect' | 'read' | 'use' | 'manage';
  resourceType: string;
  location:
    | 'tenancy'
    | {
        type: 'compartment' | 'compartment id';
        expression: string;
      };
  condition?: string;
}) => {
  const { subject, verb, resourceType, location, condition } = option;
  return `
      Allow
  
      ${
        subject == 'any-user'
          ? subject
          : `${subject.type} \n\t${subject.targets.join(', \n\t')}`
      }
  
      to ${verb} ${resourceType}
  
      in ${
        location == 'tenancy'
          ? location
          : `${location.type} ${location.expression}`
      }
  
      ${condition ? `where ${condition}` : ''}
      `.trim();
};
