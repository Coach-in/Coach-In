import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTagCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
