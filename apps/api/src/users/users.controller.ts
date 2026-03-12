import { CreateUserWithProfileDto } from './dto/create-user-with-profile.dto';
import { CreateAthleteDto } from '../athletes/dto/create-athlete.dto';
import { CreateCoachDto } from '../coachs/dto/create-coach.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common/exceptions';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
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
@ApiExtraModels(CreateUserWithProfileDto, CreateAthleteDto, CreateCoachDto)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Post('auth/signup')
  @ApiOperation({ summary: 'Register a new user (athlete or coach)' })
  @ApiBody({
    description:
      'User registration payload. Use role="athlete" or role="coach" and fill the matching profile field.',
    schema: {
      oneOf: [
        {
          title: 'Athlete signup',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['athlete'] },
            athleteProfile: {
              type: 'object',
              properties: {
                age: { type: 'number', minimum: 0 },
                goals: { type: 'string' },
                tagNames: { type: 'array', items: { type: 'string' } },
              },
              required: ['age'],
            },
          },
          required: ['email', 'username', 'password', 'role', 'athleteProfile'],
        },
        {
          title: 'Coach signup',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['coach'] },
            coachProfile: {
              type: 'object',
              properties: {
                specialty: { type: 'string' },
                bio: { type: 'string' },
                tagNames: { type: 'array', items: { type: 'string' } },
              },
              required: ['specialty'],
            },
          },
          required: ['email', 'username', 'password', 'role', 'coachProfile'],
        },
          {
          title: 'Admin signup',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['admin'] },
          },
          required: ['email', 'username', 'password', 'role'],
        },
      ],
    },
    examples: {
      athlete: {
        summary: 'Athlete signup',
        value: {
          email: 'athlete@example.com',
          username: 'john_athlete',
          password: 'password123',
          role: 'athlete',
          athleteProfile: {
            age: 22,
            goals: 'Improve endurance',
            tagNames: ['Football', 'Casual'],
          },
        },
      },
      coach: {
        summary: 'Coach signup',
        value: {
          email: 'coach@example.com',
          username: 'jane_coach',
          password: 'password123',
          role: 'coach',
          coachProfile: {
            specialty: 'Strength & Conditioning',
            bio: '10 years of experience in professional sports',
            tagNames: ['Football', 'Advanced'],
          },
        },
      },
      admin: {
        summary: 'Admin signup',
        value: {
          email: 'admin@example.com',
          username: 'admin_user',
          password: 'password123',
          role: 'admin',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Returns the created user object, the role profile (athlete or coach) with their tags, and a JWT access token.',
    content: {
      'application/json': {
        examples: {
          athlete: {
            summary: 'Athlete created',
            value: {
              user: {
                id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
                email: 'athlete@example.com',
                username: 'john_athlete',
                role: 'athlete',
                refresh_token: null,
              },
              athlete: {
                id: 'b1c2d3e4-1234-5678-abcd-ef0123456789',
                age: 22,
                goals: 'Improve endurance',
                tags: [
                  { id: 'tag-uuid-1', name: 'Football', category: { id: 'cat-uuid-1', name: 'Sport' } },
                  { id: 'tag-uuid-2', name: 'Casual', category: { id: 'cat-uuid-2', name: 'Experience level' } },
                ],
              },
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
            },
          },
          coach: {
            summary: 'Coach created',
            value: {
              user: {
                id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
                email: 'coach@example.com',
                username: 'jane_coach',
                role: 'coach',
                refresh_token: null,
              },
              coach: {
                id: 'c1d2e3f4-1234-5678-abcd-ef0123456789',
                specialty: 'Strength & Conditioning',
                bio: '10 years of experience in professional sports',
                tags: [
                  { id: 'tag-uuid-1', name: 'Football', category: { id: 'cat-uuid-1', name: 'Sport' } },
                  { id: 'tag-uuid-3', name: 'Advanced', category: { id: 'cat-uuid-2', name: 'Experience level' } },
                ],
              },
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
            },
          },
          admin: {
            summary: 'Admin created',
            value: {
              user: {
                id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
                email: 'admin@example.com',
                username: 'admin_user',
                role: 'admin',
                refresh_token: null,
              },
              admin: {
                id: 'd1e2f3a4-1234-5678-abcd-ef0123456789',
              },
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
            },
          },
        },
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
  async create(@Body() createUserWithProfileDto: CreateUserWithProfileDto) {
    return await this.usersService.create(createUserWithProfileDto);
  }

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login and get a JWT token' })
  @ApiBody({
    type: LoginUserDto,
    examples: {
      athlete: {
        summary: 'Login as athlete',
        value: { email: 'athlete@example.com', password: 'password123' },
      },
      coach: {
        summary: 'Login as coach',
        value: { email: 'coach@example.com', password: 'password123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the authenticated user object and a JWT access token.',
    content: {
      'application/json': {
        example: {
          user: {
            id: 'a3f2c1d4-1234-5678-abcd-ef0123456789',
            email: 'athlete@example.com',
            username: 'john_athlete',
            role: 'athlete',
            refresh_token: null,
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
        },
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
        email: 'athlete@example.com',
        username: 'john_athlete',
        role: 'athlete',
        refresh_token: null,
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
        message:
          'User a3f2c1d4-1234-5678-abcd-ef0123456789 updated successfully',
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
    schema: {
      example: {
        message:
          'User a3f2c1d4-1234-5678-abcd-ef0123456789 deleted successfully',
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
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }
}
