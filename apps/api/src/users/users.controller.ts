import { CreateUserDto } from './dto/create-user.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
} from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common/exceptions';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import jwt from 'jsonwebtoken';
import { TokenContent } from '../utils/types/jwt.types';
import { UsersService } from './users.service';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Post('auth/signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    schema: {
      example: {
        id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
        email: 'john@example.com',
        username: 'john_doe',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email'],
        error: 'Bad Request',
      },
    },
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'Login and get a JWT token' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the user and JWT token',
    schema: {
      example: {
        user: {
          id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
          email: 'john@example.com',
          username: 'john_doe',
        },
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhM2YyYzFkNCIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSJ9.signature',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid password',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      },
    },
  })
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.usersService.login(loginUserDto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the authenticated user',
    schema: {
      example: {
        id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
        email: 'john@example.com',
        username: 'john_doe',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token missing or invalid',
    schema: {
      example: {
        statusCode: 401,
        message: 'Token is missing or invalid',
        error: 'Unauthorized',
      },
    },
  })
  async findMe(@Headers('authorization') authHeader: string) {
    const [name, token] = authHeader?.split(' ') ?? [];
    if (name !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token is missing or invalid');
    }
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const decoded = jwt.verify(token, secret) as TokenContent;
    return await this.usersService.findOneId(decoded.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all users',
    schema: {
      example: [
        {
          id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
          email: 'john@example.com',
          username: 'john_doe',
        },
        {
          id: 'b4e3d2c1-8765-4321-dcba-fe9876543210',
          email: 'jane@example.com',
          username: 'jane_doe',
        },
      ],
    },
  })
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({
    name: 'id',
    example: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
    description: 'UUID of the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the user',
    schema: {
      example: {
        id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
        email: 'john@example.com',
        username: 'john_doe',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOneId(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({
    name: 'id',
    example: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
    description: 'UUID of the user',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    schema: {
      example: {
        id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
        email: 'john_new@example.com',
        username: 'john_doe',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      },
    },
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({
    name: 'id',
    example: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
    description: 'UUID of the user',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
    schema: { example: { message: 'User deleted successfully' } },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      },
    },
  })
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }
}
