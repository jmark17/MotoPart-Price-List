import { CompletedPurchase } from '../types/wholesale';
import { formatPHP } from './formatCurrency';

/**
 * Robust print function using an isolated hidden iframe
 * Avoids modal backdrop clipping, dark-mode ink waste, and iframe sandbox restrictions.
 */
export const printPurchaseReceipt = (purchase: CompletedPurchase) => {
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';

  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) return;

  const itemsHtml = purchase.items
    .map(
      (item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px; text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
      <td style="padding: 8px;">
        <div style="font-weight: bold; color: #0f172a; font-size: 12px;">${item.itemName}</div>
        <div style="font-size: 10px; color: #64748b; font-family: monospace;">${item.partNumber} • ${item.brand.toUpperCase()}</div>
      </td>
      <td style="padding: 8px; text-align: right; font-size: 12px; color: #0f172a;">${formatPHP(item.unitPrice)}</td>
      <td style="padding: 8px; text-align: center; font-size: 12px; font-weight: bold; color: #0f172a;">${item.quantity}</td>
      <td style="padding: 8px; text-align: right; font-size: 12px; font-weight: bold; color: #0f172a;">${formatPHP(item.subtotal)}</td>
    </tr>
  `
    )
    .join('');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${purchase.id}</title>
        <style>
          @page {
            size: auto;
            margin: 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 10px;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
          }
          .order-ref {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
          }
          .info-block {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          .buyer {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
          }
          th {
            background-color: #f1f5f9;
            padding: 8px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            color: #334155;
            border-bottom: 2px solid #cbd5e1;
            text-transform: uppercase;
          }
          .total-box {
            margin-top: 16px;
            border-top: 2px solid #0f172a;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-units {
            font-size: 12px;
            color: #475569;
            font-weight: 500;
          }
          .grand-total {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
          }
          .footer-note {
            margin-top: 28px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">MotoParts Wholesale</div>
            <div class="subtitle">Official Purchase Voucher & Receipt</div>
            <div class="order-ref">Order Ref: <strong>${purchase.id}</strong></div>
          </div>
          <div class="info-block">
            <div>Date: <strong>${purchase.dateFormatted}</strong></div>
            <div>Time: <strong>${purchase.timeFormatted}</strong></div>
            <div class="buyer">Buyer: ${purchase.buyerName || 'Walk-in Buyer'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>Item Description & Part #</th>
              <th style="text-align: right; width: 100px;">Shop Price</th>
              <th style="text-align: center; width: 50px;">Qty</th>
              <th style="text-align: right; width: 110px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-units">
            <div>Total Quantity: <strong>${purchase.totalUnits} pcs</strong> (${purchase.items.length} items)</div>
            ${
              purchase.shopPriceMargin && purchase.shopPriceMargin > 0
                ? `<div style="font-size: 11px; color: #059669; font-weight: bold; margin-top: 3px;">Shop Price Margin: +${formatPHP(purchase.shopPriceMargin)}</div>`
                : ''
            }
          </div>
          <div class="grand-total">Grand Total: ${formatPHP(purchase.grandTotal)}</div>
        </div>

        <div class="footer-note">
          Thank you for your purchase! Generated by MotoParts Wholesale Management System.
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print():', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      }, 2000);
    }
  }, 250);
};

/**
 * Print all purchase history records as a consolidated report
 */
export const printAllPurchaseHistory = (history: CompletedPurchase[]) => {
  if (!history || history.length === 0) return;

  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';

  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) return;

  const totalOrders = history.length;
  const totalUnits = history.reduce((sum, p) => sum + p.totalUnits, 0);
  const totalRevenue = history.reduce((sum, p) => sum + p.grandTotal, 0);

  const rowsHtml = history
    .map(
      (p) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; font-family: monospace; font-weight: bold; font-size: 11px;">${p.id}</td>
      <td style="padding: 6px 8px; font-size: 10.5px; white-space: nowrap;">${p.dateFormatted}<br><span style="color: #64748b;">${p.timeFormatted}</span></td>
      <td style="padding: 6px 8px; font-weight: bold; font-size: 11px;">${p.buyerName}</td>
      <td style="padding: 6px 8px; font-size: 10.5px; color: #334155;">
        ${p.items.map((i) => `${i.itemName} (${i.quantity}x)`).join(', ')}
      </td>
      <td style="padding: 6px 8px; text-align: center; font-weight: bold; font-size: 11px;">${p.totalUnits}</td>
      <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-size: 11.5px; color: #0f172a;">${formatPHP(p.grandTotal)}</td>
    </tr>
  `
    )
    .join('');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Wholesale Purchase History Report</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 10px;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 11px;
            color: #475569;
            margin-top: 2px;
          }
          .metrics {
            display: flex;
            gap: 12px;
            margin-bottom: 14px;
          }
          .metric-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            flex: 1;
          }
          .metric-label {
            font-size: 9px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
          }
          .metric-value {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background-color: #f1f5f9;
            padding: 8px;
            text-align: left;
            font-size: 10px;
            font-weight: bold;
            color: #334155;
            border-bottom: 2px solid #cbd5e1;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">MotoParts Wholesale</div>
            <div class="subtitle">Complete Purchase History & Sales Report</div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            Generated: ${new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })} ${new Date().toLocaleTimeString('en-PH', { timeStyle: 'short' })}
          </div>
        </div>

        <div class="metrics">
          <div class="metric-box">
            <div class="metric-label">Total Orders</div>
            <div class="metric-value">${totalOrders}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Total Units Sold</div>
            <div class="metric-value">${totalUnits} pcs</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Total Revenue</div>
            <div class="metric-value" style="color: #059669;">${formatPHP(totalRevenue)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 110px;">Order ID</th>
              <th style="width: 100px;">Date & Time</th>
              <th style="width: 120px;">Buyer</th>
              <th>Purchased Items</th>
              <th style="width: 50px; text-align: center;">Qty</th>
              <th style="width: 100px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #0f172a; color: #ffffff; font-weight: bold;">
              <td colspan="4" style="padding: 8px; text-align: right; font-size: 11px;">Grand Total:</td>
              <td style="padding: 8px; text-align: center; font-size: 11px;">${totalUnits} pcs</td>
              <td style="padding: 8px; text-align: right; font-size: 12px;">${formatPHP(totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print():', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      }, 2000);
    }
  }, 250);
};
