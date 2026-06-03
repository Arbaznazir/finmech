"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, AlertCircle, Check, Calendar, IndianRupee } from "lucide-react";
import api from "@/lib/api";

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  plan: string;
  billingCycle: string;
  status: string;
  description: string;
  razorpayInvoiceId: string | null;
  downloadUrl: string | null;
}

export function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/payments/invoices");
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err: any) {
      console.error("Failed to fetch invoices:", err);
      setError(err.response?.data?.error || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoice: Invoice) => {
    try {
      setDownloadingId(invoice.id);
      
      // If Razorpay has a direct download URL, use it
      if (invoice.downloadUrl) {
        window.open(invoice.downloadUrl, "_blank");
        setDownloadingId(null);
        return;
      }
      
      // Otherwise, fetch invoice data and generate PDF
      const { data } = await api.get(`/payments/invoices/${invoice.id}/download`);
      
      if (data.success) {
        if (data.downloadUrl) {
          window.open(data.downloadUrl, "_blank");
        } else if (data.invoiceData) {
          // Generate a simple text invoice for download
          generateInvoiceText(data.invoiceData);
        }
      }
    } catch (err: any) {
      console.error("Failed to download invoice:", err);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const generateInvoiceText = (invoiceData: any) => {
    const content = `
================================
         FINMECH INVOICE
================================

Invoice Number: ${invoiceData.invoiceNumber}
Date: ${invoiceData.date}

--------------------------------
BILL TO:
--------------------------------
Name: ${invoiceData.customer.name}
Email: ${invoiceData.customer.email}

--------------------------------
ITEMS:
--------------------------------
${invoiceData.items.map((item: any) => `
Description: ${item.description}
Billing Cycle: ${item.billingCycle}
Amount: ${invoiceData.currency} ${item.amount.toFixed(2)}
`).join("\n")}

--------------------------------
SUMMARY:
--------------------------------
Subtotal: ${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}
Tax (GST): ${invoiceData.currency} ${invoiceData.tax.toFixed(2)}
TOTAL: ${invoiceData.currency} ${invoiceData.total.toFixed(2)}

--------------------------------
Thank you for your business!

For support, contact: hello@finmech.com
================================
    `;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceData.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-danger" />
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No invoices yet.</p>
        <p className="text-sm mt-1">Invoices will appear here after you make a payment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Invoices</h3>
        <span className="text-sm text-muted-foreground">{invoices.length} total</span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Invoice
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Plan
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{invoice.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {invoice.date}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary capitalize">
                      {invoice.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 font-semibold">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {invoice.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                      <Check className="h-3 w-3" />
                      Paid
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => downloadInvoice(invoice)}
                      disabled={downloadingId === invoice.id}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors disabled:opacity-50"
                    >
                      {downloadingId === invoice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Invoices are generated automatically after successful payment.
      </p>
    </div>
  );
}
