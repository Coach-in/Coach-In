import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DuplicateProgrammeDto {
  @ApiPropertyOptional({
    example: 'athlete-uuid',
    description:
      'Coach: athlete to duplicate the programme for (accepted relationship required); defaults to the athlete of the source programme, or none for a template. Athlete: omit, or your own athlete id.',
  })
  @IsOptional()
  @IsUUID()
  athleteId?: string;

  @ApiPropertyOptional({
    example: 'Strength block — copy',
    maxLength: 100,
    description: 'Name of the copy; defaults to "<name> (copy)"',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: 'Overrides the start date of the source programme',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-11-15',
    description: 'Overrides the end date of the source programme',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;
}
