import {
  IsArray,
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

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];
}
