import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProgrammeDayDto } from './create-programme-day.dto';

export class CreateProgrammeDto {
  @ApiProperty({
    example: 'athlete-uuid',
    description: 'UUID of the athlete (must have an accepted relationship)',
  })
  @IsUUID()
  athleteId: string;

  @ApiProperty({ example: 'Strength block — 6 weeks', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Increase squat 1RM by 10 kg' })
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiProperty({ example: '2026-10-05', description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString({ strict: true })
  startDate: string;

  @ApiPropertyOptional({ example: '2026-11-15' })
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @ApiPropertyOptional({ type: [CreateProgrammeDayDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProgrammeDayDto)
  days?: CreateProgrammeDayDto[];
}
