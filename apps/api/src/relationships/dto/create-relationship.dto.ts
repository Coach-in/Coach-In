import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRelationshipDto {
  @ApiProperty({ example: 'athlete-uuid', description: 'UUID of the athlete' })
  @IsUUID()
  athleteId: string;

  @ApiProperty({ example: 'coach-uuid', description: 'UUID of the coach' })
  @IsUUID()
  coachId: string;
}

