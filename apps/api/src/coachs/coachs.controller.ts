import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { TokenContent } from '../utils/types/jwt.types';
import { CoachsService } from './coachs.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

const coachExample = {
  id: 'uuid',
  specialty: 'Strength & Conditioning',
  bio: '10 years of experience in professional sports',
  tags: [
    {
      id: 'uuid',
      name: 'Advanced',
      category: { id: 'uuid', name: 'Experience level' },
    },
  ],
  user: {
    id: 'uuid',
    username: 'jane_coach',
    email: 'coach@example.com',
    role: 'coach',
  },
};

@ApiTags('Coachs')
@Controller('coachs')
export class CoachsController {
  constructor(
    private readonly coachsService: CoachsService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get the coach profile of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Coach profile found',
    schema: { example: coachExample },
  })
  @ApiResponse({ status: 401, description: 'Token missing or invalid' })
  @ApiResponse({ status: 404, description: 'Coach profile not found' })
  async findMe(@Headers('authorization') authHeader: string) {
    const [scheme, token] = authHeader?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('Token is missing or invalid');
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined');
    const decoded = jwt.verify(token, secret) as TokenContent;
    return this.coachsService.findMe(decoded.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a coach' })
  @ApiBody({
    type: CreateCoachDto,
    examples: {
      example: {
        value: {
          specialty: 'Tennis',
          bio: 'Former pro player',
          tagNames: ['Advanced', 'Football'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Coach created',
    schema: { example: coachExample },
  })
  create(@Body() createCoachDto: CreateCoachDto) {
    return this.coachsService.create(createCoachDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coaches' })
  @ApiResponse({
    status: 200,
    description: 'List of coaches',
    schema: { example: [coachExample] },
  })
  findAll() {
    return this.coachsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coach by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Coach found',
    schema: { example: coachExample },
  })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  findOne(@Param('id') id: string) {
    return this.coachsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coach by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({
    type: UpdateCoachDto,
    examples: {
      example: {
        value: { bio: 'Updated bio', tagNames: ['Football', 'Advanced'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Coach updated',
    schema: { example: coachExample },
  })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  update(@Param('id') id: string, @Body() updateCoachDto: UpdateCoachDto) {
    return this.coachsService.update(id, updateCoachDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coach by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coach deleted' })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  remove(@Param('id') id: string) {
    return this.coachsService.remove(id);
  }
}
