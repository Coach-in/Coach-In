import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Raw, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { CreateUserWithProfileDto } from './dto/create-user-with-profile.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { TokenContent, UserRole } from '../utils/types/jwt.types';
import { Pagination } from '../utils/pagination';
import { CoachsService } from '../coachs/coachs.service';
import { AthletesService } from '../athletes/athletes.service';
import { AdminsService } from '../admins/admins.service';
import { AuthUser } from '../auth/auth.types';
import { assertSelfOrAdmin, isAdmin } from '../auth/ownership';

const TOKEN_LIFETIME = '10d';

@Injectable()
export class UsersService {
  private static readonly unknownUserHash = bcrypt.hashSync(
    'unknown-user-password',
    10,
  );

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly coachsService: CoachsService,
    private readonly athletesService: AthletesService,
    private readonly adminsService: AdminsService,
  ) {}

  private createAccessToken(user: User): string {
    const tokenContent: TokenContent = { userId: user.id, email: user.email };
    return jwt.sign(
      tokenContent,
      this.config.getOrThrow<string>('JWT_SECRET'),
      {
        expiresIn: TOKEN_LIFETIME,
      },
    );
  }

  private findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email: Raw((alias) => `LOWER(${alias}) = :email`, {
          email: email.trim().toLowerCase(),
        }),
      },
    });
  }

  private async assertCanCreateAdmin(requester?: AuthUser): Promise<void> {
    if (requester && isAdmin(requester)) return;
    if ((await this.adminsService.count()) === 0) return;
    throw new ForbiddenException(
      'Only an administrator can create an admin account',
    );
  }

  async create(dto: CreateUserWithProfileDto, requester?: AuthUser) {
    if (dto.role === UserRole.ADMIN) await this.assertCanCreateAdmin(requester);

    if (await this.findByEmail(dto.email)) {
      throw new ConflictException('Email already in use');
    }

    const password = await bcrypt.hash(dto.password, 10);

    const created = await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).save(
        Object.assign(new User(), {
          email: dto.email,
          username: dto.username,
          role: dto.role,
          password,
        }),
      );

      if (dto.role === UserRole.COACH) {
        const coach = await this.coachsService.create(
          dto.coachProfile!,
          user,
          manager,
        );
        return { user, coach };
      }
      if (dto.role === UserRole.ADMIN) {
        const admin = await this.adminsService.create(
          dto.adminProfile ?? {},
          user,
          manager,
        );
        return { user, admin };
      }
      const athlete = await this.athletesService.create(
        dto.athleteProfile!,
        user,
        manager,
      );
      return { user, athlete };
    });

    return { ...created, token: this.createAccessToken(created.user) };
  }

  async findAll(page?: Pagination) {
    return await this.userRepository.find({
      order: { username: 'ASC' },
      take: page?.limit,
      skip: page?.offset,
    });
  }

  async findOneId(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOneAs(id: string, requester: AuthUser) {
    assertSelfOrAdmin(requester, id);
    return await this.findOneId(id);
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.findByEmail(email);

    const passwordMatches = await bcrypt.compare(
      password,
      user?.password ?? UsersService.unknownUserHash,
    );
    if (!user || !user.password || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return { user, token: this.createAccessToken(user) };
  }

  async update(id: string, updateUserDto: UpdateUserDto, requester: AuthUser) {
    assertSelfOrAdmin(requester, id);
    await this.findOneId(id);

    const { email, username, password } = updateUserDto;
    const changes: Partial<User> = {};
    if (email !== undefined) {
      const owner = await this.findByEmail(email);
      if (owner && owner.id !== id) {
        throw new ConflictException('Email already in use');
      }
      changes.email = email;
    }
    if (username !== undefined) changes.username = username;
    if (password !== undefined)
      changes.password = await bcrypt.hash(password, 10);

    if (Object.keys(changes).length > 0) {
      await this.userRepository.update(id, changes);
    }

    return { message: `User ${id} updated successfully` };
  }

  async remove(id: string, requester: AuthUser) {
    assertSelfOrAdmin(requester, id);
    await this.findOneId(id);
    await this.userRepository.delete(id);

    return { message: `User ${id} deleted successfully` };
  }
}
