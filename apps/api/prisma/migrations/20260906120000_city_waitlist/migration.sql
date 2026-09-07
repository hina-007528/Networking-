-- CreateTable
CREATE TABLE "city_waitlist" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "city_waitlist_city_created_at_idx" ON "city_waitlist"("city", "created_at");

-- CreateIndex
CREATE INDEX "city_waitlist_phone_idx" ON "city_waitlist"("phone");
