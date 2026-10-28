import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignProgrammeDto {
  @ApiProperty({
    example: 'athlete-uuid',
    description: 'UUID of the athlete (must have an accepted relationship)',
  })
  @IsUUID()
  athleteId: string;

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
