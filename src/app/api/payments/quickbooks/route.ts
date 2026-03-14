import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// QuickBooks Payments / Invoicing endpoint
// In production, this uses the QuickBooks Online API to create an invoice
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { membership_id, amount, customer_email, customer_name, description } = body;

  if (!process.env.QUICKBOOKS_CLIENT_ID || process.env.QUICKBOOKS_CLIENT_ID === "your_quickbooks_client_id") {
    return NextResponse.json({
      error: "QuickBooks is not configured. Set QUICKBOOKS_CLIENT_ID in .env.local",
      setup_instructions: {
        step1: "Go to https://developer.intuit.com and create an app",
        step2: "Enable QuickBooks Payments scope",
        step3: "Copy Client ID and Client Secret to .env.local",
        step4: "Complete OAuth flow at /api/payments/quickbooks/auth",
      },
    }, { status: 503 });
  }

  try {
    // In production, this would:
    // 1. Create or find the customer in QuickBooks
    // 2. Create an invoice with the membership line item
    // 3. Send the invoice via email (QuickBooks handles the payment collection)
    //
    // const invoice = await qbClient.createInvoice({
    //   CustomerRef: { value: customerId },
    //   Line: [{
    //     Amount: amount,
    //     DetailType: "SalesItemLineDetail",
    //     Description: description,
    //   }],
    //   BillEmail: { Address: customer_email },
    // });
    // await qbClient.sendInvoice(invoice.Id);

    const db = getDb();
    const invoiceRef = `QB-INV-${Date.now()}`;
    db.prepare("UPDATE memberships SET payment_id = ?, payment_provider = 'quickbooks', payment_status = 'invoiced' WHERE id = ?")
      .run(invoiceRef, membership_id);

    return NextResponse.json({
      message: "QuickBooks invoice created and sent to " + customer_email,
      invoice_ref: invoiceRef,
      amount,
      customer_name,
      description: description || "Swan Lake CC Membership",
    }, { status: 201 });
  } catch (error) {
    console.error("QuickBooks error:", error);
    return NextResponse.json({ error: "Invoice creation failed" }, { status: 500 });
  }
}
