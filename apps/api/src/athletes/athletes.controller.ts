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
import { AthletesService } from './athletes.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';

const athleteExample = {
  id: 'uuid',
  age: 22,
  sport: 'Tennis',
  level: 'advanced',
  goals: 'Reach national competition',
  tags: [{ id: 'uuid', name: 'advanced', category: { id: 'uuid', name: 'experience' } }],
};

@ApiTags('Athletes')
@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletesService: AthletesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an athlete' })
  @ApiBody({ type: CreateAthleteDto, examples: { example: { value: { age: 22, sport: 'Tennis', level: 'advanced', goals: 'Reach national competition', tagNames: ['advanced'] } } } })
  @ApiResponse({ status: 201, description: 'Athlete created', schema: { example: athleteExample } })
  create(@Body() createAthleteDto: CreateAthleteDto) {
    return this.athletesService.create(createAthleteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all athletes' })
  @ApiResponse({ status: 200, description: 'List of athletes', schema: { example: [athleteExample] } })
  findAll() {
    return this.athletesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an athlete by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Athlete found', schema: { example: athleteExample } })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  findOne(@Param('id') id: string) {
    return this.athletesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an athlete by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiBody({ type: UpdateAthleteDto, examples: { example: { value: { level: 'casual', tagNames: ['casual', 'football'] } } } })
  @ApiResponse({ status: 200, description: 'Athlete updated', schema: { example: athleteExample } })
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
