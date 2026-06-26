-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "purchase_rate_enc" TEXT;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "avg_purchase_cost_enc" TEXT,
ADD COLUMN     "item_profit_enc" TEXT,
ADD COLUMN     "purchase_price_enc" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "gross_profit_enc" TEXT,
ADD COLUMN     "total_purchase_cost_enc" TEXT;
