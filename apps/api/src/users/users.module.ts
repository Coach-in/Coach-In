import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { CoachsModule } from '../coachs/coachs.module';
import { AthletesModule } from '../athletes/athletes.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CoachsModule, AthletesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
