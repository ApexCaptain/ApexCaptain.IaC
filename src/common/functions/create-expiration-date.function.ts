import { BadRequestException } from '@nestjs/common';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, Min, validateSync } from 'class-validator';

export class CreateExpirationDateOptions {
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
export function createExpirationDate(
  options: CreateExpirationDateOptions = {},
) {
  const instanciatedOptions = plainToInstance(
    CreateExpirationDateOptions,
    options,
  ) as Required<CreateExpirationDateOptions>;

  const errors = validateSync(instanciatedOptions);
  if (errors.length > 0) throw new BadRequestException(errors);

  const denominatorSeconds =
    instanciatedOptions.seconds +
    instanciatedOptions.minutes * 60 +
    instanciatedOptions.hours * 60 * 60 +
    instanciatedOptions.days * 24 * 60 * 60;
  const denominator = (denominatorSeconds ? denominatorSeconds : 1) * 1000;

  const expriationDate = new Date(
    Math.floor(Date.now() / denominator) * denominator + denominator,
  );
  return expriationDate;
}
