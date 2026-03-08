import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ConfigService} from '@nestjs/config';
import {CreateUserDto} from './dto/create-user.dto';
import {UpdateUserDto} from './dto/update-user.dto';
import {User} from "./entities/user.entity";
import {Repository} from "typeorm";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {TokenContent} from '../utils/types/jwt.types';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly config: ConfigService,
    ) {}

    async create(createUserDto: CreateUserDto) {
        const {email, username, password} = createUserDto;

        const user = await this.userRepository.save({
            email,
            username,
            password: await bcrypt.hash(password, 10)
        });

        const tokenContent: TokenContent = {userId: user.id, email: user.email};
        const secret = this.config.get<string>('JWT_SECRET');

        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const token = jwt.sign(tokenContent, secret, {expiresIn: '10d'});

        return {user, token};
    }

    async findAll() {
        return await this.userRepository.find();
    }

    async findOne(id: string) {
        return await this.userRepository.findOneBy({id});
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        await this.userRepository.update(id, updateUserDto);

        return {message: `User ${id} updated successfully`};
    }

    async remove(id: string) {
        await this.userRepository.delete(id);

        return {message: `User ${id} deleted successfully`};
    }
}
