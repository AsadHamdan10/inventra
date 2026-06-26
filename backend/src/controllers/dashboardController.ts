import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { safeDecryptFinancial } from '../utils/financialCrypto';

// Same logic as saleController.ts's decryptFinancialWithFallback — kept
// in sync deliberately. See that file for the full explanation of why a
// plain `||` chain between the decrypted value and the plaintext column
// is wrong (it can't distinguish "missing" from "legitimately zero").
function decryptFinancialWithFallback(encValue: string | null | undefined, plaintextValue: any): number {
  if (encValue !== null && encValue !== undefined && encValue !== '') {
    return safeDecryptFinancial(encValue);
  }
  return Number(plaintextValue ?? 0);
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalSales, totalPurchases, totalExpenses, thisMonthSales, thisMonthPurchases,
      outstanding, payables, inventoryCount, vendorCount, customerCount,
      recentSales, recentPurchases, monthlyRevenue, expensesByCategory,
      bankBalance, gstPayable, lowStockItems,
    ] = await Promise.all([
      prisma.sale.findMany({
  where: {
    userId,
    invoiceDate: { gte: startOfYear }
  },
  select: {
    grandTotal: true,
    grossProfit: true,
    grossProfitEnc: true,
  },
}),
      prisma.purchase.aggregate({ where: { userId, billDate: { gte: startOfYear } }, _sum: { grandTotal: true, totalGst: true }, _count: true }),
      prisma.expense.aggregate({ where: { userId, expenseDate: { gte: startOfYear }, deductProfit: true }, _sum: { amount: true } }),
      prisma.sale.findMany({
  where: {
    userId,
    invoiceDate: { gte: startOfMonth }
  },
  select: {
    grandTotal: true,
    grossProfit: true,
    grossProfitEnc: true,
  },
}),
      prisma.purchase.aggregate({ where: { userId, billDate: { gte: startOfMonth } }, _sum: { grandTotal: true }, _count: true }),
      prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(grand_total - payment_received), 0) as total FROM sales WHERE user_id = ${userId} AND grand_total > payment_received`,
      prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(grand_total - payment_paid), 0) as total FROM purchases WHERE user_id = ${userId} AND grand_total > payment_paid`,
      prisma.material.count({ where: { userId } }),
      prisma.vendor.count({ where: { userId } }),
      prisma.customer.count({ where: { userId } }),
      prisma.sale.findMany({ where: { userId }, orderBy: { invoiceDate: 'desc' }, take: 5, select: { id:true, invoiceNo:true, companyName:true, grandTotal:true, invoiceDate:true, grossProfit:true, grossProfitEnc:true, paymentReceived:true } }),
      prisma.purchase.findMany({ where: { userId }, orderBy: { billDate: 'desc' }, take: 5, select: { id:true, billNo:true, vendorName:true, grandTotal:true, billDate:true, paymentPaid:true } }),
      prisma.$queryRaw<any[]>`SELECT TO_CHAR(invoice_date,'YYYY-MM') as month, SUM(grand_total) as revenue, SUM(gross_profit) as profit, COUNT(*) as count FROM sales WHERE user_id=${userId} AND invoice_date >= NOW()-INTERVAL '12 months' GROUP BY TO_CHAR(invoice_date,'YYYY-MM') ORDER BY month ASC`,
      prisma.expense.groupBy({ by:['category'], where:{ userId, expenseDate:{gte:startOfYear} }, _sum:{amount:true}, orderBy:{_sum:{amount:'desc'}} }),
      // Bank balance: sum of all credits - debits
      prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(CASE WHEN txn_type='credit' THEN amount ELSE -amount END),0) as balance FROM bank_statements WHERE user_id=${userId}`,
      // GST payable: output GST (sales) - input GST (purchases) this year
      prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(total_gst),0) as output FROM sales WHERE user_id=${userId} AND invoice_date >= ${startOfYear}`,
      // Low stock: materials with stock < 10 units
      prisma.$queryRaw<any[]>`
        SELECT m.material_name,
          COALESCE(p.total_qty,0) - COALESCE(s.total_qty,0) as stock
        FROM materials m
        LEFT JOIN (SELECT material_name, SUM(quantity) as total_qty FROM purchase_items pi JOIN purchases pu ON pi.purchase_id=pu.id WHERE pu.user_id=${userId} GROUP BY material_name) p ON p.material_name=m.material_name
        LEFT JOIN (SELECT material_name, SUM(quantity) as total_qty FROM sale_items si JOIN sales sa ON si.sale_id=sa.id WHERE sa.user_id=${userId} GROUP BY material_name) s ON s.material_name=m.material_name
        WHERE m.user_id=${userId} AND (COALESCE(p.total_qty,0) - COALESCE(s.total_qty,0)) < 10
        ORDER BY stock ASC LIMIT 5
      `,
    ]);
const ytdSalesTotal =
  totalSales.reduce(
    (sum, s) => sum + Number(s.grandTotal || 0),
    0
  );

const ytdProfitTotal =
  totalSales.reduce(
    (sum, s) =>
      sum +
      decryptFinancialWithFallback(s.grossProfitEnc, s.grossProfit),
    0
  );

const mtdSalesTotal =
  thisMonthSales.reduce(
    (sum, s) => sum + Number(s.grandTotal || 0),
    0
  );

const mtdProfitTotal =
  thisMonthSales.reduce(
    (sum, s) =>
      sum +
      decryptFinancialWithFallback(s.grossProfitEnc, s.grossProfit),
    0
  );
    const purchaseGst = await prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(total_gst),0) as input FROM purchases WHERE user_id=${userId} AND bill_date >= ${startOfYear}`;
    const gstPaid = await prisma.gstPayment.aggregate({ where:{userId, paymentDate:{gte:startOfYear}}, _sum:{amountPaid:true} });
    const outputGst = Number((gstPayable as any[])[0]?.output || 0);
    const inputGst = Number(purchaseGst[0]?.input || 0);
    const netGstPayable = Math.max(0, outputGst - inputGst - Number(gstPaid._sum.amountPaid || 0));

    res.json({
      summary: {
        ytd: {
          sales: {
  total: ytdSalesTotal,
  profit: ytdProfitTotal,
  count: totalSales.length,
},
          purchases: { total: Number(totalPurchases._sum.grandTotal||0), gst: Number(totalPurchases._sum.totalGst||0), count: totalPurchases._count },
          expenses: Number(totalExpenses._sum.amount||0),
        },
        mtd: {
          sales: {
  total: mtdSalesTotal,
  profit: mtdProfitTotal,
  count: thisMonthSales.length,
},
          purchases: { total: Number(thisMonthPurchases._sum.grandTotal||0), count: thisMonthPurchases._count },
        },
        outstanding: { receivables: Number(outstanding[0]?.total||0), payables: Number(payables[0]?.total||0) },
        counts: { materials: inventoryCount, vendors: vendorCount, customers: customerCount },
        bankBalance: Number((bankBalance as any[])[0]?.balance||0),
        gstPayable: netGstPayable,
      },
      recentSales: recentSales.map(s => ({
        ...s,
        grandTotal: Number(s.grandTotal),
        grossProfit: decryptFinancialWithFallback(s.grossProfitEnc, s.grossProfit),
        paymentReceived: Number(s.paymentReceived),
      })),
      recentPurchases: recentPurchases.map(p => ({...p, grandTotal:Number(p.grandTotal), paymentPaid:Number(p.paymentPaid)})),
      charts: {
        monthlyRevenue: (monthlyRevenue as any[]).map(r => ({ month:r.month, revenue:Number(r.revenue), profit:Number(r.profit), count:Number(r.count) })),
        expensesByCategory: expensesByCategory.map(e => ({ category:e.category, amount:Number(e._sum.amount||0) })),
      },
      lowStockItems: (lowStockItems as any[]).map(i => ({ materialName:i.material_name, stock:Number(i.stock) })),
    });
  } catch (err) { next(err); }
}