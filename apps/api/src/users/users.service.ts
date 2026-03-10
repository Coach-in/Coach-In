import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { TokenContent } from '../utils/types/jwt.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  private async createAccessToken(user: User) {
    const tokenContent: TokenContent = { userId: user.id, email: user.email };
    const secret = this.config.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return jwt.sign(tokenContent, secret, { expiresIn: '10d' });
  }

  async create(createUserDto: CreateUserDto) {
    const user = await this.userRepository.save({
      ...createUserDto,
      password: await bcrypt.hash(createUserDto.password, 10),
    });

    const token: string = await this.createAccessToken(user);

    return { user, token };
  }

  async findAll() {
    return await this.userRepository.find();
  }

  async findOneId(id: string) {
    return await this.userRepository.findOneBy({ id });
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.userRepository.findOneBy({ email });

    if (!user || !user.password) {
      throw new NotFoundException('User not found');
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid password');
    }

    const token: string = await this.createAccessToken(user);

    return { user, token };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.userRepository.update(id, updateUserDto);

    return { message: `User ${id} updated successfully` };
  }

  async remove(id: string) {
    await this.userRepository.delete(id);

    return { message: `User ${id} deleted successfully` };
  }
}
