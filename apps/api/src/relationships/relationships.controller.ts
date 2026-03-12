import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';
import { CreateRelationshipDto } from './dto/create-relationship.dto';

const relationshipExample = {
  id: 'rel-uuid-1234',
  status: 'pending',
  createdAt: '2026-03-12T10:00:00.000Z',
  athlete: {
    id: 'athlete-uuid',
    age: 22,
    goals: 'Improve endurance',
    user: { id: 'user-athlete-uuid', username: 'john_athlete', email: 'athlete@example.com', role: 'athlete' },
    tags: [{ id: 'tag-uuid', name: 'Football', category: { id: 'cat-uuid', name: 'Sport' } }],
  },
  coach: {
    id: 'coach-uuid',
    specialty: 'Tennis',
    bio: 'Former pro player',
    isApproved: true,
    user: { id: 'user-coach-uuid', username: 'jane_coach', email: 'coach@example.com', role: 'coach' },
    tags: [{ id: 'tag-uuid-2', name: 'Advanced', category: { id: 'cat-uuid-2', name: 'Experience level' } }],
  },
};

@ApiTags('Relationships')
@ApiBearerAuth('access-token')
@Controller('relationships')
export class RelationshipsController {
  private readonly logger = new Logger(RelationshipsController.name);

  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Post()
  @ApiOperation({ summary: 'Athlete requests a coaching relationship with a coach' })
  @ApiBody({
    type: CreateRelationshipDto,
    examples: {
      request: {
        summary: 'Request relationship',
        value: { athleteId: 'athlete-uuid', coachId: 'coach-uuid' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Relationship created (pending). A notification is sent to the coach.',
    schema: { example: relationshipExample },
  })
  @ApiResponse({ status: 404, description: 'Athlete or Coach not found.' })
  async create(@Body() dto: CreateRelationshipDto) {
    this.logger.debug(`[POST /relationships] Request from athleteId=${dto.athleteId} to coachId=${dto.coachId}`);
    const result = await this.relationshipsService.create(dto);
    this.logger.log(`[POST /relationships] Relationship created id=${result.id}`);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all relationships' })
  @ApiResponse({ status: 200, description: 'List of all relationships.', schema: { example: [relationshipExample] } })
  async findAll() {
    this.logger.debug(`[GET /relationships] Fetching all relationships`);
    return this.relationshipsService.findAll();
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Coach accepts a relationship request — notifies the athlete' })
  @ApiParam({ name: 'id', example: 'rel-uuid-1234', description: 'UUID of the relationship' })
  @ApiResponse({
    status: 201,
    description: 'Relationship accepted. A notification is sent to the athlete.',
    schema: { example: { ...relationshipExample, status: 'accepted' } },
  })
  @ApiResponse({ status: 404, description: 'Relationship not found.' })
  async accept(@Param('id') id: string) {
    this.logger.debug(`[POST /relationships/${id}/accept] Accept request`);
    const result = await this.relationshipsService.accept(id);
    this.logger.log(`[POST /relationships/${id}/accept] Relationship accepted, athlete notified`);
    return result;
  }

  @Post(':id/refuse')
  @ApiOperation({ summary: 'Coach refuses a relationship request — notifies the athlete' })
  @ApiParam({ name: 'id', example: 'rel-uuid-1234', description: 'UUID of the relationship' })
  @ApiResponse({
    status: 201,
    description: 'Relationship refused. A notification is sent to the athlete.',
    schema: { example: { ...relationshipExample, status: 'refused' } },
  })
  @ApiResponse({ status: 404, description: 'Relationship not found.' })
  async refuse(@Param('id') id: string) {
    this.logger.debug(`[POST /relationships/${id}/refuse] Refuse request`);
    const result = await this.relationshipsService.refuse(id);
    this.logger.log(`[POST /relationships/${id}/refuse] Relationship refused, athlete notified`);
    return result;
  }
}
