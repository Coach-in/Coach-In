import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAthleteDto {
  @IsNumber()
  @Min(0)
  age: number;

  @IsString()
  @IsNotEmpty()
  sport: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  goals?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];
}
