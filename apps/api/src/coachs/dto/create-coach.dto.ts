import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCoachDto {
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @IsString()
  @IsOptional()
  certifications?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
