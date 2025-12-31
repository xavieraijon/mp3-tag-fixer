/*
  Warnings:

  - You are about to drop the column `githubId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `googleId` on the `User` table. All the data in the column will be lost.
  - Made the column `passwordHash` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "User_githubId_key";

-- DropIndex
DROP INDEX "User_googleId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "githubId",
DROP COLUMN "googleId",
ADD COLUMN     "lastName" TEXT,
ALTER COLUMN "passwordHash" SET NOT NULL;
