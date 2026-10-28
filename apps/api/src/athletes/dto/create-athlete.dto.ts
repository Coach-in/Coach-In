import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAthleteDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  age: number;

  @IsString()
  @IsOptional()
  goals?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];
}
