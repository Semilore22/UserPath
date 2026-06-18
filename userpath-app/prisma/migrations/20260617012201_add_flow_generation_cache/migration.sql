-- CreateTable
CREATE TABLE "FlowGenerationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "FlowGenerationCache_cacheKey_key" ON "FlowGenerationCache"("cacheKey");
