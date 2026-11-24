import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationRework1793198438417 implements MigrationInterface {
  name = 'NotificationRework1793198438417';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_90543bacf107cdd564e9b62cd2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD "type" character varying NOT NULL DEFAULT 'generic'`,
    );
    await queryRunner.query(`ALTER TABLE "notification" ADD "data" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "notification" ADD "link" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD "readAt" TIMESTAMP(3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ALTER COLUMN "sentAt" TYPE TIMESTAMP(3)`,
    );
    await queryRunner.query(
      `UPDATE "notification" SET "readAt" = "sentAt" WHERE "status" = 'seen'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_56023c91b76b36125acd4dcd9c" ON "notification" ("sender_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_receiver_sent_at" ON "notification" ("receiver_id", "sentAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notification_receiver_sent_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_56023c91b76b36125acd4dcd9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ALTER COLUMN "sentAt" TYPE TIMESTAMP(6)`,
    );
    await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "readAt"`);
    await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "link"`);
    await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "data"`);
    await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "type"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_90543bacf107cdd564e9b62cd2" ON "notification" ("receiver_id") `,
    );
  }
}
