-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Learner',
    "avatar" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TEXT,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctQuestions" INTEGER NOT NULL DEFAULT 0,
    "estimatedScore" INTEGER NOT NULL DEFAULT 0,
    "readingScore" INTEGER NOT NULL DEFAULT 0,
    "listeningScore" INTEGER NOT NULL DEFAULT 0,
    "speakingScore" INTEGER NOT NULL DEFAULT 0,
    "writingScore" INTEGER NOT NULL DEFAULT 0,
    "dailyGoalXp" INTEGER NOT NULL DEFAULT 80,
    "dailyXpEarned" INTEGER NOT NULL DEFAULT 0,
    "dailyXpDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "skill" TEXT,
    "title" TEXT,
    "score" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER,
    "total" INTEGER,
    "durationSec" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "subskill" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "question" TEXT NOT NULL,
    "userAnswer" TEXT,
    "correctAnswer" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionAttempt_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'learning',
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'bronze'
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" DATETIME,
    CONSTRAINT "UserAchievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Weakness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "subskill" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Weakness_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_profileId_createdAt_idx" ON "ActivityLog"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionAttempt_profileId_skill_createdAt_idx" ON "QuestionAttempt"("profileId", "skill", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionAttempt_profileId_isCorrect_idx" ON "QuestionAttempt"("profileId", "isCorrect");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_profileId_achievementId_key" ON "UserAchievement"("profileId", "achievementId");

-- CreateIndex
CREATE INDEX "Weakness_profileId_errorCount_idx" ON "Weakness"("profileId", "errorCount");

-- CreateIndex
CREATE UNIQUE INDEX "Weakness_profileId_skill_subskill_key" ON "Weakness"("profileId", "skill", "subskill");

