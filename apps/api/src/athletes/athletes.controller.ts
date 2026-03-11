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
import { AthletesService } from './athletes.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';

const athleteExample = {
  id: 'uuid',
  age: 22,
  goals: 'Reach national competition',
  tags: [
    {
      id: 'uuid',
      name: 'Advanced',
      category: { id: 'uuid', name: 'Experience level' },
    },
  ],
  user: {
    id: 'uuid',
    username: 'john_athlete',
    email: 'athlete@example.com',
    role: 'athlete',
  },
};

@ApiTags('Athletes')
@Controller('athletes')
export class AthletesController {
  constructor(
    private readonly athletesService: AthletesService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get the athlete profile of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Athlete profile found',
    schema: { example: athleteExample },
  })
  @ApiResponse({ status: 401, description: 'Token missing or invalid' })
  @ApiResponse({ status: 404, description: 'Athlete profile not found' })
  async findMe(@Headers('authorization') authHeader: string) {
    const [scheme, token] = authHeader?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('Token is missing or invalid');
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined');
    const decoded = jwt.verify(token, secret) as TokenContent;
    return this.athletesService.findMe(decoded.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an athlete' })
  @ApiBody({
    type: CreateAthleteDto,
    examples: {
      example: {
        value: {
          age: 22,
          goals: 'Reach national competition',
          tagNames: ['Advanced', 'Football'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Athlete created',
    schema: { example: athleteExample },
  })
  create(@Body() createAthleteDto: CreateAthleteDto) {
    return this.athletesService.create(createAthleteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all athletes' })
  @ApiResponse({
    status: 200,
    description: 'List of athletes',
    schema: { example: [athleteExample] },
  })
  findAll() {
    return this.athletesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an athlete by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Athlete found',
    schema: { example: athleteExample },
  })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  findOne(@Param('id') id: string) {
    return this.athletesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an athlete by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({
    type: UpdateAthleteDto,
    examples: {
      example: {
        value: { goals: 'Lose weight', tagNames: ['Casual', 'Football'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Athlete updated',
    schema: { example: athleteExample },
  })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  update(@Param('id') id: string, @Body() updateAthleteDto: UpdateAthleteDto) {
    return this.athletesService.update(id, updateAthleteDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an athlete by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Athlete deleted' })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  remove(@Param('id') id: string) {
    return this.athletesService.remove(id);
  }
}
