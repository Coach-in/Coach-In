import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793188601100 implements MigrationInterface {
  name = 'InitialSchema1793188601100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "email" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'athlete', "password" character varying, "refresh_token" character varying, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tag" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "category_id" uuid, CONSTRAINT "UQ_6a9775008add570dc3e5a0bab7b" UNIQUE ("name"), CONSTRAINT "PK_8e4052373c579afc1471f526760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tag_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "UQ_f48a9fe1f705a7c2a60856d395a" UNIQUE ("name"), CONSTRAINT "PK_3249fd70734f41f513a1d5d3ef7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "athlete" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "age" integer NOT NULL, "goals" character varying, "user_id" uuid, CONSTRAINT "REL_8ac83bd14da912d15e86da1c4f" UNIQUE ("user_id"), CONSTRAINT "PK_8bf51e0689529ca963f10949596" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "coach" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "specialty" character varying NOT NULL, "bio" character varying, "isApproved" boolean NOT NULL DEFAULT false, "user_id" uuid, CONSTRAINT "REL_1f2795aa1fb31dd9444f96aa80" UNIQUE ("user_id"), CONSTRAINT "PK_c2ca0875fe0755b197d0147713d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10f64b952270ea7d9ca28f34a0" ON "coach" ("isApproved") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."relationship_status_enum" AS ENUM('pending', 'accepted', 'refused')`,
    );
    await queryRunner.query(
      `CREATE TABLE "relationship" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."relationship_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "athlete_id" uuid, "coach_id" uuid, CONSTRAINT "PK_67eb56a3f16da3d901a8ae446a6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ca582f49c00057e951ee27ca49" ON "relationship" ("athlete_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2e8f385d9ddc767e2682695d23" ON "relationship" ("coach_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_status_enum" AS ENUM('unseen', 'seen')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" character varying NOT NULL, "status" "public"."notification_status_enum" NOT NULL DEFAULT 'unseen', "sentAt" TIMESTAMP NOT NULL DEFAULT now(), "sender_id" uuid, "receiver_id" uuid, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_90543bacf107cdd564e9b62cd2" ON "notification" ("receiver_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coach_document" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "originalName" character varying NOT NULL, "mimeType" character varying NOT NULL, "s3Key" character varying NOT NULL, "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(), "coach_id" uuid, CONSTRAINT "PK_baaf72056bd3deb810ab7042fc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18a1def07585cb84b0e54d98f9" ON "coach_document" ("coach_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "admin" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, CONSTRAINT "REL_a28028ba709cd7e5053a86857b" UNIQUE ("user_id"), CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "athlete_tags" ("athleteId" uuid NOT NULL, "tagId" uuid NOT NULL, CONSTRAINT "PK_b597765254a2dcb2c3e45fa2fe7" PRIMARY KEY ("athleteId", "tagId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d009e568a1a5c7f12ec3d045e1" ON "athlete_tags" ("athleteId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_663832109beaf6b33377ab961b" ON "athlete_tags" ("tagId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coach_tags" ("coachId" uuid NOT NULL, "tagId" uuid NOT NULL, CONSTRAINT "PK_950b2ee0b76f3eab6dcc85b7d0a" PRIMARY KEY ("coachId", "tagId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afcb1f4c23c3f0cc34284d98e9" ON "coach_tags" ("coachId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03b64b0829affe86d514556d2e" ON "coach_tags" ("tagId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tag" ADD CONSTRAINT "FK_3249fd70734f41f513a1d5d3ef7" FOREIGN KEY ("category_id") REFERENCES "tag_category"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "athlete" ADD CONSTRAINT "FK_8ac83bd14da912d15e86da1c4f1" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coach" ADD CONSTRAINT "FK_1f2795aa1fb31dd9444f96aa803" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "relationship" ADD CONSTRAINT "FK_ca582f49c00057e951ee27ca49c" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "relationship" ADD CONSTRAINT "FK_2e8f385d9ddc767e2682695d23e" FOREIGN KEY ("coach_id") REFERENCES "coach"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_56023c91b76b36125acd4dcd9c5" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_90543bacf107cdd564e9b62cd20" FOREIGN KEY ("receiver_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coach_document" ADD CONSTRAINT "FK_18a1def07585cb84b0e54d98f90" FOREIGN KEY ("coach_id") REFERENCES "coach"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" ADD CONSTRAINT "FK_a28028ba709cd7e5053a86857b4" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "athlete_tags" ADD CONSTRAINT "FK_d009e568a1a5c7f12ec3d045e10" FOREIGN KEY ("athleteId") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "athlete_tags" ADD CONSTRAINT "FK_663832109beaf6b33377ab961bf" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "coach_tags" ADD CONSTRAINT "FK_afcb1f4c23c3f0cc34284d98e94" FOREIGN KEY ("coachId") REFERENCES "coach"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "coach_tags" ADD CONSTRAINT "FK_03b64b0829affe86d514556d2e7" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "coach_tags" DROP CONSTRAINT "FK_03b64b0829affe86d514556d2e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coach_tags" DROP CONSTRAINT "FK_afcb1f4c23c3f0cc34284d98e94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "athlete_tags" DROP CONSTRAINT "FK_663832109beaf6b33377ab961bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "athlete_tags" DROP CONSTRAINT "FK_d009e568a1a5c7f12ec3d045e10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin" DROP CONSTRAINT "FK_a28028ba709cd7e5053a86857b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coach_document" DROP CONSTRAINT "FK_18a1def07585cb84b0e54d98f90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_90543bacf107cdd564e9b62cd20"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_56023c91b76b36125acd4dcd9c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "relationship" DROP CONSTRAINT "FK_2e8f385d9ddc767e2682695d23e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "relationship" DROP CONSTRAINT "FK_ca582f49c00057e951ee27ca49c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coach" DROP CONSTRAINT "FK_1f2795aa1fb31dd9444f96aa803"`,
    );
    await queryRunner.query(
      `ALTER TABLE "athlete" DROP CONSTRAINT "FK_8ac83bd14da912d15e86da1c4f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tag" DROP CONSTRAINT "FK_3249fd70734f41f513a1d5d3ef7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_03b64b0829affe86d514556d2e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afcb1f4c23c3f0cc34284d98e9"`,
    );
    await queryRunner.query(`DROP TABLE "coach_tags"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_663832109beaf6b33377ab961b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d009e568a1a5c7f12ec3d045e1"`,
    );
    await queryRunner.query(`DROP TABLE "athlete_tags"`);
    await queryRunner.query(`DROP TABLE "admin"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18a1def07585cb84b0e54d98f9"`,
    );
    await queryRunner.query(`DROP TABLE "coach_document"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_90543bacf107cdd564e9b62cd2"`,
    );
    await queryRunner.query(`DROP TABLE "notification"`);
    await queryRunner.query(`DROP TYPE "public"."notification_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2e8f385d9ddc767e2682695d23"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ca582f49c00057e951ee27ca49"`,
    );
    await queryRunner.query(`DROP TABLE "relationship"`);
    await queryRunner.query(`DROP TYPE "public"."relationship_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10f64b952270ea7d9ca28f34a0"`,
    );
    await queryRunner.query(`DROP TABLE "coach"`);
    await queryRunner.query(`DROP TABLE "athlete"`);
    await queryRunner.query(`DROP TABLE "tag_category"`);
    await queryRunner.query(`DROP TABLE "tag"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
