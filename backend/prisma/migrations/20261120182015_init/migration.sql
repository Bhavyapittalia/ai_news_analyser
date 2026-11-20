/*
  Warnings:

  - You are about to drop the `assignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "assignment";

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(255),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);
