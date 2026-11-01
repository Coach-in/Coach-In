import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    example: 20,
    description:
      'Page size. Without it the whole list is returned, newest first.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Opaque cursor taken from the X-Next-Cursor header of the previous page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Only return notifications that are not read yet.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean()
  unread?: boolean;
}
