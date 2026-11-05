import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
