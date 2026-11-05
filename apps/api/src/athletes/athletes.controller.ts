import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AthletesService } from './athletes.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/types/jwt.types';
import { PaginationQueryDto } from '../utils/pagination';

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
  constructor(private readonly athletesService: AthletesService) {}

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
  async findMe(@CurrentUser() user: AuthUser) {
    return this.athletesService.findMe(user.id);
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
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  findAll(@Query() page: PaginationQueryDto) {
    return this.athletesService.findAll(page);
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
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthUser,
  ) {
    return this.athletesService.findOneAs(id, requester);
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAthleteDto: UpdateAthleteDto,
    @CurrentUser() requester: AuthUser,
  ) {
    return this.athletesService.update(id, updateAthleteDto, requester);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an athlete by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Athlete deleted' })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthUser,
  ) {
    return this.athletesService.remove(id, requester);
  }
}
