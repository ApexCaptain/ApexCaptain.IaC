export type PartiallyRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
