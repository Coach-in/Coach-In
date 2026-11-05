import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../utils/normalize-email';
export class LoginUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @NormalizeEmail()
  @IsEmail()
  email: string;
  @ApiProperty({
    example: 'Str0ngP@ss',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
