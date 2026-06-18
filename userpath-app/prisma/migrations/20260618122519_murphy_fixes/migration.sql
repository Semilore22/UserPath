-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "editType" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL DEFAULT '',
    "newValue" TEXT NOT NULL DEFAULT '',
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EditLog_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EditLog" ("editType", "editedAt", "flowId", "id", "newValue", "previousValue", "sessionId") SELECT "editType", "editedAt", "flowId", "id", "newValue", "previousValue", "sessionId" FROM "EditLog";
DROP TABLE "EditLog";
ALTER TABLE "new_EditLog" RENAME TO "EditLog";
CREATE INDEX "EditLog_flowId_idx" ON "EditLog"("flowId");
CREATE TABLE "new_Flow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "flowType" TEXT NOT NULL,
    "targetUsers" TEXT NOT NULL,
    "keyAction" TEXT NOT NULL,
    "rawDescription" TEXT NOT NULL,
    "nodes" TEXT NOT NULL,
    "edges" TEXT NOT NULL,
    "userJourneySteps" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Flow" ("createdAt", "edges", "flowType", "id", "keyAction", "lastEditedAt", "nodes", "productName", "rawDescription", "sessionId", "targetUsers", "userJourneySteps") SELECT "createdAt", "edges", "flowType", "id", "keyAction", coalesce("lastEditedAt", CURRENT_TIMESTAMP) AS "lastEditedAt", "nodes", "productName", "rawDescription", "sessionId", "targetUsers", "userJourneySteps" FROM "Flow";
DROP TABLE "Flow";
ALTER TABLE "new_Flow" RENAME TO "Flow";
CREATE INDEX "Flow_sessionId_idx" ON "Flow"("sessionId");
CREATE INDEX "Flow_sessionId_createdAt_idx" ON "Flow"("sessionId", "createdAt");
CREATE TABLE "new_FlowGenerationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlowGenerationCache_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FlowGenerationCache" ("cacheKey", "createdAt", "flowId", "id") SELECT "cacheKey", "createdAt", "flowId", "id" FROM "FlowGenerationCache";
DROP TABLE "FlowGenerationCache";
ALTER TABLE "new_FlowGenerationCache" RENAME TO "FlowGenerationCache";
CREATE UNIQUE INDEX "FlowGenerationCache_cacheKey_key" ON "FlowGenerationCache"("cacheKey");
CREATE TABLE "new_RateLimit" (
    "ipAddress" TEXT NOT NULL PRIMARY KEY,
    "generationCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" DATETIME NOT NULL,
    "windowExpires" DATETIME NOT NULL,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "RateLimit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RateLimit" ("generationCount", "ipAddress", "sessionId", "windowExpires", "windowStart") SELECT "generationCount", "ipAddress", "sessionId", "windowExpires", "windowStart" FROM "RateLimit";
DROP TABLE "RateLimit";
ALTER TABLE "new_RateLimit" RENAME TO "RateLimit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
