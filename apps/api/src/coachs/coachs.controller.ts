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
import { CoachsService } from './coachs.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/types/jwt.types';
import { Public } from '../auth/public.decorator';
import { PaginationQueryDto } from '../utils/pagination';

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
  constructor(private readonly coachsService: CoachsService) {}

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
  async findMe(@CurrentUser() user: AuthUser) {
    return this.coachsService.findMe(user.id);
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
  @Roles(UserRole.ADMIN)
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
  @Public()
  findAll(@Query() page: PaginationQueryDto) {
    return this.coachsService.findAll(page);
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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCoachDto: UpdateCoachDto,
    @CurrentUser() requester: AuthUser,
  ) {
    return this.coachsService.update(id, updateCoachDto, requester);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coach by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coach deleted' })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthUser,
  ) {
    return this.coachsService.remove(id, requester);
  }
}
