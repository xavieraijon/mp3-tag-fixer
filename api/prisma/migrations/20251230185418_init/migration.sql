-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'ACTIVE', 'CANCELED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('PENDING', 'SEARCHING', 'READY', 'DONE', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "googleId" TEXT,
    "githubId" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'FREE',
    "subscriptionEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileHash" TEXT,
    "title" TEXT,
    "artist" TEXT,
    "album" TEXT,
    "year" INTEGER,
    "genre" TEXT,
    "bpm" INTEGER,
    "label" TEXT,
    "trackNumber" INTEGER,
    "albumArtist" TEXT,
    "composer" TEXT,
    "comment" TEXT,
    "discogsReleaseId" INTEGER,
    "discogsTrackPos" TEXT,
    "coverImageUrl" TEXT,
    "searchQuery" TEXT,
    "searchScore" INTEGER,
    "status" "TrackStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Track_userId_idx" ON "Track"("userId");

-- CreateIndex
CREATE INDEX "Track_fileHash_idx" ON "Track"("fileHash");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
