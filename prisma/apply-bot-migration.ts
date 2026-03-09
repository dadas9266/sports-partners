import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Applying bot system migration...");

  // 1. Enum oluştur (zaten varsa hata vermez)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "BotTaskStatus" AS ENUM ('PENDING','LISTING_CREATED','RESPONSE_SENT','MATCH_DONE','FAILED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log("✓ BotTaskStatus enum");

  // 2. User tablosuna isBot ve botPersona ekle (zaten varsa hata vermez)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "isBot" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "botPersona" TEXT;
  `);
  console.log("✓ User.isBot / User.botPersona columns");

  // 3. BotTask tablosunu oluştur
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BotTask" (
      "id"             TEXT NOT NULL,
      "listingBotId"   TEXT NOT NULL,
      "responderBotId" TEXT NOT NULL,
      "countryId"      TEXT,
      "cityId"         TEXT,
      "sportId"        TEXT,
      "status"         "BotTaskStatus" NOT NULL DEFAULT 'PENDING',
      "delaySeconds"   INTEGER NOT NULL DEFAULT 300,
      "listingId"      TEXT,
      "responseId"     TEXT,
      "matchId"        TEXT,
      "errorMessage"   TEXT,
      "scheduledAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "executedAt"     TIMESTAMP(3),
      "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BotTask_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log("✓ BotTask table");

  // 4. Index'ler
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BotTask_status_idx" ON "BotTask"("status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BotTask_cityId_idx" ON "BotTask"("cityId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BotTask_listingBotId_idx" ON "BotTask"("listingBotId");`);
  console.log("✓ Indexes");

  // 5. Foreign keys (zaten varsa hata vermez)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_listingBotId_fkey"
        FOREIGN KEY ("listingBotId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_responderBotId_fkey"
        FOREIGN KEY ("responderBotId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_countryId_fkey"
        FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_cityId_fkey"
        FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "BotTask" ADD CONSTRAINT "BotTask_sportId_fkey"
        FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log("✓ Foreign keys");

  // 6. Migration history'ye kaydet (resolve)
  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
    VALUES (
      gen_random_uuid()::text,
      'bot_system_manual',
      NOW(), '20260309000001_add_bot_system', NULL, NULL, NOW(), 1
    )
    ON CONFLICT DO NOTHING;
  `);
  console.log("✓ Migration history updated");

  console.log("\n✅ Bot system migration completed successfully!");
}

main()
  .catch((e) => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
