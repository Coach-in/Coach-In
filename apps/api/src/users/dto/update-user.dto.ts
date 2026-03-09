import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'john_doe' })
  username?: string;

  @ApiPropertyOptional({ example: 'NewStr0ngP@ss' })
  password?: string;
}
