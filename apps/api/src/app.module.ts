import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { CoachsModule } from './coachs/coachs.module';
import { Coach } from './coachs/entities/coach.entity';
import { AthletesModule } from './athletes/athletes.module';
import { Athlete } from './athletes/entities/athlete.entity';
import { TagsModule } from './tags/tags.module';
import { Tag } from './tags/entities/tag.entity';
import { TagCategory } from './tags/entities/tag-category.entity';
import { AdminsModule } from './admins/admins.module';
import { Admin } from './admins/entities/admin.entity';
import { CoachDocumentsModule } from './coach-documents/coach-documents.module';
import { CoachDocument } from './coach-documents/entities/coach-document.entity';
import { RelationshipsModule } from './relationships/relationships.module';
import { Relationship } from './relationships/entities/relationship.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { Notification } from './notifications/entities/notification.entity';
import { ExercisesModule } from './exercises/exercises.module';
import { Exercise } from './exercises/entities/exercise.entity';
import { ProgrammesModule } from './programmes/programmes.module';
import { Programme } from './programmes/entities/programme.entity';
import { ProgrammeDay } from './programmes/entities/programme-day.entity';
import { ProgrammeExercise } from './programmes/entities/programme-exercise.entity';

const isProduction = (config: ConfigService): boolean =>
  config.get<string>('NODE_ENV') === 'production';

const synchronize = (config: ConfigService): boolean => {
  const flag = config.get<string>('DB_SYNCHRONIZE');
  return flag ? flag === 'true' : !isProduction(config);
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [
          User,
          Coach,
          Athlete,
          Tag,
          TagCategory,
          Admin,
          CoachDocument,
          Relationship,
          Notification,
          Exercise,
          Programme,
          ProgrammeDay,
          ProgrammeExercise,
        ],
        synchronize: synchronize(config),
        migrations: [join(__dirname, 'database', 'migrations', '*.{js,ts}')],
        migrationsRun: isProduction(config),
        extra: {
          max: 10,
          idleTimeoutMillis: 30000,
        },
      }),
    }),
    AuthModule,
    UsersModule,
    CoachsModule,
    AthletesModule,
    TagsModule,
    AdminsModule,
    CoachDocumentsModule,
    RelationshipsModule,
    NotificationsModule,
    ExercisesModule,
    ProgrammesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
