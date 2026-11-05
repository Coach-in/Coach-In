import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../utils/types/jwt.types';
import { Public } from '../auth/public.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  @ApiBody({
    type: CreateTagDto,
    examples: {
      example: { value: { name: 'ping pong', categoryName: 'sport' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tag created',
    schema: {
      example: {
        id: 'uuid',
        name: 'ping pong',
        category: { id: 'uuid', name: 'sport' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Roles(UserRole.ADMIN)
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({
    status: 200,
    description: 'List of tags',
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'ping pong',
          category: { id: 'uuid', name: 'sport' },
        },
      ],
    },
  })
  @Public()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Tag found',
    schema: {
      example: {
        id: 'uuid',
        name: 'ping pong',
        category: { id: 'uuid', name: 'sport' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tagsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag by id' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tag deleted' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tagsService.remove(id);
  }
}
