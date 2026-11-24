import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProgrammeDayDto } from './create-programme-day.dto';

export class UpdateProgrammeDayDto extends PartialType(
  OmitType(CreateProgrammeDayDto, ['exercises'] as const),
) {}
