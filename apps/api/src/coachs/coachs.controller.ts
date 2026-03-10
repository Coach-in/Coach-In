import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CoachsService } from './coachs.service';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@Controller('coachs')
export class CoachsController {
  constructor(private readonly coachsService: CoachsService) {}

  @Post()
  create(@Body() createCoachDto: CreateCoachDto) {
    return this.coachsService.create(createCoachDto);
  }

  @Get()
  findAll() {
    return this.coachsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coachsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCoachDto: UpdateCoachDto) {
    return this.coachsService.update(+id, updateCoachDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coachsService.remove(+id);
  }
}
