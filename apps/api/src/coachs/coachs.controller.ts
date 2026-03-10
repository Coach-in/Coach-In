import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CoachsService } from './coachs.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

const coachExample = {
  id: 'uuid',
  specialty: 'Tennis',
  bio: 'Former pro player with 10 years of coaching experience',
  tags: [{ id: 'uuid', name: 'ping pong', category: { id: 'uuid', name: 'sport' } }],
};

@ApiTags('Coachs')
@Controller('coachs')
export class CoachsController {
  constructor(private readonly coachsService: CoachsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a coach' })
  @ApiBody({ type: CreateCoachDto, examples: { example: { value: { specialty: 'Tennis', bio: 'Former pro player', tagNames: ['ping pong', 'advanced'] } } } })
  @ApiResponse({ status: 201, description: 'Coach created', schema: { example: coachExample } })
  create(@Body() createCoachDto: CreateCoachDto) {
    return this.coachsService.create(createCoachDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coaches' })
  @ApiResponse({ status: 200, description: 'List of coaches', schema: { example: [coachExample] } })
  findAll() {
    return this.coachsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coach by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Coach found', schema: { example: coachExample } })
  @ApiResponse({ status: 404, description: 'Coach not found' })
  findOne(@Param('id') id: string) {
    return this.coachsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coach by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateCoachDto, examples: { example: { value: { bio: 'Updated bio', tagNames: ['football'] } } } })
  @ApiResponse({ status: 200, description: 'Coach updated', schema: { example: coachExample } })
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
