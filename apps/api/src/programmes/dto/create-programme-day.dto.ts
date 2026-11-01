import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProgrammeExerciseDto } from './create-programme-exercise.dto';

export class CreateProgrammeDayDto {
  @ApiProperty({
    example: 1,
    description: '1-based day number, counted from the programme startDate',
  })
  @IsInt()
  @Min(1)
  dayIndex: number;

  @ApiPropertyOptional({ example: 'Push day', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Warm up 10 min on the bike' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateProgrammeExerciseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProgrammeExerciseDto)
  exercises?: CreateProgrammeExerciseDto[];
}
