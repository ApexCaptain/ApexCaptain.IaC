import { BadRequestException } from '@nestjs/common';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, Min, validateSync } from 'class-validator';

export class CreateExpirationDateTriggerOptions {
  /**
   * @description expiration date trigger seconds
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  seconds?: number;

  /**
   * @description expiration date trigger minutes
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  minutes?: number;

  /**
   * @description expiration date trigger hours
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  hours?: number;

  /**
   * @description expiration date trigger days
   */
  @Expose()
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  @Transform(({ value }) => value ?? 0)
  days?: number;
}

/**
 * @description create expiration date trigger for terraform
 * @param options
 * @returns expiration date trigger
 */
export function createExpirationDateTrigger(
  options: CreateExpirationDateTriggerOptions = {},
) {
  const instanciatedOptions = plainToInstance(
    CreateExpirationDateTriggerOptions,
    options,
  ) as Required<CreateExpirationDateTriggerOptions>;

  const errors = validateSync(instanciatedOptions);
  if (errors.length > 0) throw new BadRequestException(errors);

  const denominator =
    (instanciatedOptions.seconds +
      instanciatedOptions.minutes * 60 +
      instanciatedOptions.hours * 60 * 60 +
      instanciatedOptions.days * 24 * 60 * 60) *
    1000;

  return Math.floor(Date.now() / (denominator ? denominator : 1)).toString();
}
