import { PartialType } from '@nestjs/swagger';
import { CreateProgrammeExerciseDto } from './create-programme-exercise.dto';

export class UpdateProgrammeExerciseDto extends PartialType(
  CreateProgrammeExerciseDto,
) {}
