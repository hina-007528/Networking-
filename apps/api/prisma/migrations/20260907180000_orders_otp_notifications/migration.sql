-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_OTP', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'SCHEDULED', 'INSTALLED');

-- CreateEnum
CREATE TYPE "NotifyStatus" AS ENUM ('SENT', 'FAILED');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "paid_method" TEXT;
ALTER TABLE "invoices" ADD COLUMN "paid_by_admin_id" UUID;

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "install_address" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_OTP',
    "otp_code_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "confirmed_at" TIMESTAMP(3),
    "subscription_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject_or_tag" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "related_order_id" UUID,
    "status" "NotifyStatus" NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_subscription_id_key" ON "orders"("subscription_id");
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");
CREATE INDEX "orders_plan_id_idx" ON "orders"("plan_id");
CREATE INDEX "notification_logs_related_order_id_created_at_idx" ON "notification_logs"("related_order_id", "created_at");
CREATE INDEX "notification_logs_status_created_at_idx" ON "notification_logs"("status", "created_at");
CREATE INDEX "notification_logs_created_at_idx" ON "notification_logs"("created_at");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_by_admin_id_fkey" FOREIGN KEY ("paid_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
