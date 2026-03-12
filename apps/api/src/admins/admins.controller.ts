import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
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
import { AdminsService } from './admins.service';
import { UpdateAdminDto } from './dto/update-admin.dto';

const adminExample = {
  id: 'a1b2c3d4-1234-5678-abcd-ef0123456789',
  user: {
    id: 'u1b2c3d4-1234-5678-abcd-ef0123456789',
    username: 'admin_user',
    email: 'admin@example.com',
    role: 'admin',
    refresh_token: null,
  },
};

@ApiTags('Admins')
@Controller('admins')
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get the admin profile of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the admin profile linked to the authenticated user.',
    schema: { example: adminExample },
  })
  @ApiResponse({
    status: 401,
    description: 'Token missing or invalid',
    schema: {
      example: {
        statusCode: 401,
        message: 'Token is missing or invalid',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Admin profile not found for this user',
    schema: {
      example: {
        statusCode: 404,
        message: 'Admin profile not found for user <userId>',
        error: 'Not Found',
      },
    },
  })
  async findMe(@Headers('authorization') authHeader: string) {
    const [scheme, token] = authHeader?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('Token is missing or invalid');
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined');
    const decoded = jwt.verify(token, secret) as TokenContent;
    return this.adminsService.findMe(decoded.userId);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all admin profiles.',
    schema: { example: [adminExample] },
  })
  findAll() {
    return this.adminsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get an admin by id' })
  @ApiParam({
    name: 'id',
    example: 'a1b2c3d4-1234-5678-abcd-ef0123456789',
    description: 'UUID of the admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the admin profile.',
    schema: { example: adminExample },
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Admin #<id> not found',
        error: 'Not Found',
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.adminsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an admin by id' })
  @ApiParam({
    name: 'id',
    example: 'a1b2c3d4-1234-5678-abcd-ef0123456789',
    description: 'UUID of the admin',
  })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Admin successfully updated.',
    schema: { example: adminExample },
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Admin #<id> not found',
        error: 'Not Found',
      },
    },
  })
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminsService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete an admin by id' })
  @ApiParam({
    name: 'id',
    example: 'a1b2c3d4-1234-5678-abcd-ef0123456789',
    description: 'UUID of the admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin successfully deleted.',
    schema: {
      example: {
        message:
          'Admin a1b2c3d4-1234-5678-abcd-ef0123456789 deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Admin #<id> not found',
        error: 'Not Found',
      },
    },
  })
  remove(@Param('id') id: string) {
    return this.adminsService.remove(id);
  }
}
