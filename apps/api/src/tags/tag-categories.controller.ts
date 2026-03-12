import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TagCategoriesService } from './tag-categories.service';
import { CreateTagCategoryDto } from './dto/create-tag-category.dto';

@ApiTags('Tag Categories')
@Controller('tag-categories')
export class TagCategoriesController {
  constructor(private readonly tagCategoriesService: TagCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tag category' })
  @ApiBody({
    type: CreateTagCategoryDto,
    examples: { example: { value: { name: 'sport' } } },
  })
  @ApiResponse({
    status: 201,
    description: 'Tag category created',
    schema: { example: { id: 'uuid', name: 'sport' } },
  })
  create(@Body() dto: CreateTagCategoryDto) {
    return this.tagCategoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tag categories' })
  @ApiResponse({
    status: 200,
    description: 'List of tag categories',
    schema: {
      example: [
        { id: 'uuid', name: 'sport' },
        { id: 'uuid', name: 'experience' },
      ],
    },
  })
  findAll() {
    return this.tagCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag category by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Tag category found',
    schema: { example: { id: 'uuid', name: 'sport' } },
  })
  @ApiResponse({ status: 404, description: 'Tag category not found' })
  findOne(@Param('id') id: string) {
    return this.tagCategoriesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag category by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tag category deleted' })
  @ApiResponse({ status: 404, description: 'Tag category not found' })
  remove(@Param('id') id: string) {
    return this.tagCategoriesService.remove(id);
  }
}
