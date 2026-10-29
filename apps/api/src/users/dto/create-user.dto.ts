import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NormalizeEmail } from '../../utils/normalize-email';

export class CreateUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'john_doe', description: 'Unique username' })
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'Str0ngP@ss',
    description: 'Password (min 8 characters)',
  })
  @MinLength(8)
  password: string;
}
