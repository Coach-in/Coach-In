import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  @ApiBody({ type: CreateTagDto, examples: { example: { value: { name: 'ping pong', categoryName: 'sport' } } } })
  @ApiResponse({ status: 201, description: 'Tag created', schema: { example: { id: 'uuid', name: 'ping pong', category: { id: 'uuid', name: 'sport' } } } })
  @ApiResponse({ status: 404, description: 'Category not found' })
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({ status: 200, description: 'List of tags', schema: { example: [{ id: 'uuid', name: 'ping pong', category: { id: 'uuid', name: 'sport' } }] } })
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tag found', schema: { example: { id: 'uuid', name: 'ping pong', category: { id: 'uuid', name: 'sport' } } } })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tag deleted' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}

