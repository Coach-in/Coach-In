import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
        ],
        synchronize: true,
        extra: {
          max: 10,
          idleTimeoutMillis: 30000,
        },
      }),
    }),
    UsersModule,
    CoachsModule,
    AthletesModule,
    TagsModule,
    AdminsModule,
    CoachDocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
