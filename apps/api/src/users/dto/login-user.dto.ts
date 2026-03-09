import { IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class LoginUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;
  @ApiProperty({
    example: 'Str0ngP@ss',
    description: 'User password (min 8 characters)',
  })
  @MinLength(8)
  password: string;
}
