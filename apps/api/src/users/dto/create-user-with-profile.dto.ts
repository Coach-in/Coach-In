import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { CreateAthleteDto } from '../../athletes/dto/create-athlete.dto';
import { CreateCoachDto } from '../../coachs/dto/create-coach.dto';
import { UserRole} from "../../utils/types/jwt.types";

export class CreateUserWithProfileDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  username: string;

  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @ValidateIf((o) => o.role === UserRole.ATHLETE)
  @ValidateNested()
  @Type(() => CreateAthleteDto)
  athleteProfile?: CreateAthleteDto;

  @ValidateIf((o) => o.role === UserRole.COACH)
  @ValidateNested()
  @Type(() => CreateCoachDto)
  coachProfile?: CreateCoachDto;
}
