-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'admin', 'staff');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "InvestorStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "BankTxnType" AS ENUM ('credit', 'debit');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "mobile" TEXT,
    "mobile_hash" VARCHAR(64),
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'admin',
    "status" "Status" NOT NULL DEFAULT 'pending',
    "force_password_change" BOOLEAN NOT NULL DEFAULT false,
    "gstin" TEXT,
    "gstin_hash" VARCHAR(64),
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" VARCHAR(100) DEFAULT 'India',
    "pan_number" TEXT,
    "pan_number_hash" VARCHAR(64),
    "profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL DEFAULT 0,
    "action" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "scope" VARCHAR(100) NOT NULL DEFAULT 'general',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_sequences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tenant_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vendor_name" VARCHAR(200) NOT NULL,
    "vendor_gstin" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "gstin" TEXT,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "delivery_address" TEXT,
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "material_name" VARCHAR(200) NOT NULL,
    "hsn_code" VARCHAR(20),
    "unit" VARCHAR(50) NOT NULL DEFAULT 'Nos',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bill_no" VARCHAR(100) NOT NULL,
    "bill_date" DATE NOT NULL,
    "vendor_id" INTEGER,
    "vendor_name" VARCHAR(200) NOT NULL,
    "vendor_gstin" TEXT,
    "other_expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "round_off" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "payment_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_taxable" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_gst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" SERIAL NOT NULL,
    "purchase_id" INTEGER NOT NULL,
    "material_name" VARCHAR(200) NOT NULL,
    "hsn_code" VARCHAR(20),
    "quantity" DECIMAL(15,3) NOT NULL,
    "purchase_rate" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "gst_percent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "item_total" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_input_bills" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bill_no" VARCHAR(100) NOT NULL,
    "bill_date" DATE NOT NULL,
    "seller_name" VARCHAR(200) NOT NULL,
    "seller_gstin" TEXT,
    "gst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "category" VARCHAR(100) NOT NULL DEFAULT 'General',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_input_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_adjustments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "seller_name" VARCHAR(200) NOT NULL,
    "seller_gstin" TEXT,
    "gst_bill_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pct_paid" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "profit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "txn_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "invoice_no" VARCHAR(100) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "customer_id" INTEGER,
    "company_name" VARCHAR(200) NOT NULL,
    "company_gstin" TEXT,
    "customer_address" TEXT,
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "po_no" VARCHAR(100),
    "other_expense" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "round_off" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "payment_received" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "total_taxable" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_gst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_purchase_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gross_profit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "profit_pct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "delivery_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "material_name" VARCHAR(200) NOT NULL,
    "hsn_code" VARCHAR(20),
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "purchase_price" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "gst_percent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gst_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "item_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "avg_purchase_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "item_profit" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_payments" (
    "id" SERIAL NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date_received" DATE NOT NULL,
    "mode" VARCHAR(50) NOT NULL DEFAULT 'Cash',
    "reference" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_payments" (
    "id" SERIAL NOT NULL,
    "purchase_id" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date_paid" DATE NOT NULL,
    "mode" VARCHAR(50) NOT NULL DEFAULT 'Cash',
    "reference" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "payment_month" VARCHAR(7) NOT NULL,
    "amount_paid" DECIMAL(15,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "reference" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expense_name" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "category" VARCHAR(100) NOT NULL DEFAULT 'General',
    "deduct_profit" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "investor_name" VARCHAR(200) NOT NULL,
    "mobile" TEXT,
    "invested_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "profit_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "joined_date" DATE,
    "status" "InvestorStatus" NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intermediary" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "seller_company" VARCHAR(200) NOT NULL,
    "buyer_company" VARCHAR(200) NOT NULL,
    "material_name" VARCHAR(200),
    "quantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "profit_per_unit" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "total_profit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deal_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intermediary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "account_name" VARCHAR(200) NOT NULL,
    "bank_name" VARCHAR(200),
    "account_number" TEXT,
    "ifsc_code" VARCHAR(20),
    "branch_name" TEXT,
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "account_id" INTEGER,
    "txn_date" DATE NOT NULL,
    "txn_type" "BankTxnType" NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance" DECIMAL(15,2),
    "category" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_itc_ledger" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ledger_month" VARCHAR(7) NOT NULL,
    "opening_igst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "opening_cgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "opening_sgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "utilized_igst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "utilized_cgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "utilized_sgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "closing_igst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "closing_cgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "closing_sgst" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_itc_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_hash_key" ON "users"("mobile_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_gstin_hash_key" ON "users"("gstin_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_pan_number_hash_key" ON "users"("pan_number_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_tokens_token_key" ON "support_tokens"("token");

-- CreateIndex
CREATE INDEX "support_tokens_user_id_idx" ON "support_tokens"("user_id");

-- CreateIndex
CREATE INDEX "support_tokens_token_idx" ON "support_tokens"("token");

-- CreateIndex
CREATE INDEX "support_tokens_expires_at_idx" ON "support_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "tenant_sequences_user_id_idx" ON "tenant_sequences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_sequences_user_id_prefix_key" ON "tenant_sequences"("user_id", "prefix");

-- CreateIndex
CREATE INDEX "vendors_user_id_idx" ON "vendors"("user_id");

-- CreateIndex
CREATE INDEX "customers_user_id_idx" ON "customers"("user_id");

-- CreateIndex
CREATE INDEX "materials_user_id_idx" ON "materials"("user_id");

-- CreateIndex
CREATE INDEX "purchases_user_id_idx" ON "purchases"("user_id");

-- CreateIndex
CREATE INDEX "purchases_bill_date_idx" ON "purchases"("bill_date");

-- CreateIndex
CREATE INDEX "purchases_vendor_id_idx" ON "purchases"("vendor_id");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "gst_input_bills_user_id_idx" ON "gst_input_bills"("user_id");

-- CreateIndex
CREATE INDEX "gst_adjustments_user_id_idx" ON "gst_adjustments"("user_id");

-- CreateIndex
CREATE INDEX "sales_user_id_idx" ON "sales"("user_id");

-- CreateIndex
CREATE INDEX "sales_invoice_date_idx" ON "sales"("invoice_date");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "receivable_payments_sale_id_idx" ON "receivable_payments"("sale_id");

-- CreateIndex
CREATE INDEX "payable_payments_purchase_id_idx" ON "payable_payments"("purchase_id");

-- CreateIndex
CREATE INDEX "gst_payments_user_id_idx" ON "gst_payments"("user_id");

-- CreateIndex
CREATE INDEX "expenses_user_id_idx" ON "expenses"("user_id");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "investors_user_id_idx" ON "investors"("user_id");

-- CreateIndex
CREATE INDEX "intermediary_user_id_idx" ON "intermediary"("user_id");

-- CreateIndex
CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

-- CreateIndex
CREATE INDEX "bank_statements_user_id_idx" ON "bank_statements"("user_id");

-- CreateIndex
CREATE INDEX "bank_statements_txn_date_idx" ON "bank_statements"("txn_date");

-- CreateIndex
CREATE INDEX "gst_itc_ledger_user_id_idx" ON "gst_itc_ledger"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gst_itc_ledger_user_id_ledger_month_key" ON "gst_itc_ledger"("user_id", "ledger_month");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tokens" ADD CONSTRAINT "support_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sequences" ADD CONSTRAINT "tenant_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_input_bills" ADD CONSTRAINT "gst_input_bills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_adjustments" ADD CONSTRAINT "gst_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_payments" ADD CONSTRAINT "gst_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investors" ADD CONSTRAINT "investors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermediary" ADD CONSTRAINT "intermediary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_itc_ledger" ADD CONSTRAINT "gst_itc_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
