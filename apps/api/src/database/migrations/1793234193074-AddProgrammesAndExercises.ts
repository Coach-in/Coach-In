import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgrammesAndExercises1793234193074 implements MigrationInterface {
  name = 'AddProgrammesAndExercises1793234193074';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "exercise" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "s3Key" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "created_by_athlete" uuid, CONSTRAINT "UQ_4420597915e901ab5d6f2bcaee4" UNIQUE ("name"), CONSTRAINT "PK_a0f107e3a2ef2742c1e91d97c14" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "programme_exercise" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order" integer NOT NULL, "sets" integer NOT NULL, "reps" integer NOT NULL, "weight" double precision, "rpe" double precision, "restSeconds" integer, "notes" text, "day_id" uuid NOT NULL, "exercise_id" uuid NOT NULL, CONSTRAINT "PK_a3e232aa4051a7ff01f6c3c70bb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "programme_day" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dayIndex" integer NOT NULL, "name" character varying, "notes" text, "programme_id" uuid NOT NULL, CONSTRAINT "UQ_e7353d6f77ddb0943000a48e6a5" UNIQUE ("programme_id", "dayIndex"), CONSTRAINT "PK_c2fb3013679b1cea490bc967ec8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "programme" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "objectives" text, "startDate" date NOT NULL, "endDate" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "coach_id" uuid, "athlete_id" uuid, CONSTRAINT "PK_76ff6b30b74f213944d1ac0a660" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD CONSTRAINT "FK_771ebb8e1484ce936d4a556f065" FOREIGN KEY ("created_by") REFERENCES "coach"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" ADD CONSTRAINT "FK_9d178e8a8a9bf1252cc6998dffb" FOREIGN KEY ("created_by_athlete") REFERENCES "athlete"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme_exercise" ADD CONSTRAINT "FK_8909d9f5c3017fa1ff555a7aeb7" FOREIGN KEY ("day_id") REFERENCES "programme_day"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme_exercise" ADD CONSTRAINT "FK_77a103c5b134bc7a5057710266f" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme_day" ADD CONSTRAINT "FK_c2401ecef2506b19a039a67a92f" FOREIGN KEY ("programme_id") REFERENCES "programme"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme" ADD CONSTRAINT "FK_fc2dd1ec820219c717b2dd39ce3" FOREIGN KEY ("coach_id") REFERENCES "coach"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme" ADD CONSTRAINT "FK_01741978e0afffbf9d38edd7bd2" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "programme" DROP CONSTRAINT "FK_01741978e0afffbf9d38edd7bd2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme" DROP CONSTRAINT "FK_fc2dd1ec820219c717b2dd39ce3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme_day" DROP CONSTRAINT "FK_c2401ecef2506b19a039a67a92f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme_exercise" DROP CONSTRAINT "FK_77a103c5b134bc7a5057710266f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "programme_exercise" DROP CONSTRAINT "FK_8909d9f5c3017fa1ff555a7aeb7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP CONSTRAINT "FK_9d178e8a8a9bf1252cc6998dffb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exercise" DROP CONSTRAINT "FK_771ebb8e1484ce936d4a556f065"`,
    );
    await queryRunner.query(`DROP TABLE "programme"`);
    await queryRunner.query(`DROP TABLE "programme_day"`);
    await queryRunner.query(`DROP TABLE "programme_exercise"`);
    await queryRunner.query(`DROP TABLE "exercise"`);
  }
}
