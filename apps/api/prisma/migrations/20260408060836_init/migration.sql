-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MED', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "summary" TEXT,
    "severity" "Severity",
    "suggestedAction" TEXT,
    "aiProvider" TEXT,
    "aiLatencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Watchlist_createdAt_idx" ON "Watchlist"("createdAt");

-- CreateIndex
CREATE INDEX "Event_watchlistId_createdAt_idx" ON "Event"("watchlistId", "createdAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
