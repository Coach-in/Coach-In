import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgrammeExerciseDto {
  @ApiProperty({
    example: 'exercise-uuid',
    description: 'UUID of a catalogue exercise',
  })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({ example: 1, description: 'Position within the day' })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  sets: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  reps: number;

  @ApiPropertyOptional({ example: 80, description: 'Load in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 8, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  rpe?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number;

  @ApiPropertyOptional({ example: 'Pause 1s at the bottom' })
  @IsOptional()
  @IsString()
  notes?: string;
}
