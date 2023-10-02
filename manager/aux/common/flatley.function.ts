import flatten from 'flat';

export const flatley = <TargetType, ResultType>(
  target: TargetType,
  opts?: {
    coercion?: {
      test: (key: string, value: any) => boolean;
      transform: (value: any) => any;
    }[];
    filters?: {
      test: (key: string, value: any) => boolean;
    }[];
  } & Parameters<typeof flatten>[1],
): ResultType => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('flatley')(target, opts);
};
