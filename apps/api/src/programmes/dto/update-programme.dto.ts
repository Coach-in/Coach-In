import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProgrammeDto } from './create-programme.dto';

// The athlete cannot be changed; days are managed through their own routes
export class UpdateProgrammeDto extends PartialType(
  OmitType(CreateProgrammeDto, ['athleteId', 'days'] as const),
) {}
