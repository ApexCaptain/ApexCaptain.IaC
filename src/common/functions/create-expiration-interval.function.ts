import { BadRequestException } from '@nestjs/common';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, Min, validateSync } from 'class-validator';

export class CreateExpirationIntervalOptions {
  /**
   * @description expiration date seconds
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  seconds?: number;

  /**
   * @description expiration date minutes
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  minutes?: number;

  /**
   * @description expiration date hours
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  hours?: number;

  /**
   * @description expiration date days
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  days?: number;
}

/**
 * @description create expiration date for terraform
 * @param options
 * @returns expiration date
 */
export function createExpirationInterval(
  options: CreateExpirationIntervalOptions = {},
) {
  const instanciatedOptions = plainToInstance(
    CreateExpirationIntervalOptions,
    options,
  ) as Required<CreateExpirationIntervalOptions>;

  const errors = validateSync(instanciatedOptions);
  if (errors.length > 0) throw new BadRequestException(errors);
  const { seconds, minutes, hours, days } = instanciatedOptions;

  const denominator = (() => {
    const result =
      seconds + minutes * 60 + hours * 60 * 60 + days * 24 * 60 * 60;
    return (result ? result : 1) * 1000;
  })();

  return new Date(
    Math.floor(Date.now() / denominator) * denominator + denominator,
  );
}
