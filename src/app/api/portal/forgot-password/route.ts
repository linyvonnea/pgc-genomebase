// API Route: POST /api/portal/forgot-password
// Looks up inquiries by the client's Google-authenticated email and
// sends them an email listing their inquiry ID(s) / passwords.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const PORTAL_URL = "https://pgc-genomebase.vercel.app/portal";

// Simple in-memory rate limiter: max 3 requests per email per 15 min window.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Server configuration error. Please try again later." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const email: string = (body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    // Rate limit by email address
    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait 15 minutes before trying again." },
        { status: 429 }
      );
    }

    // Query inquiries matching this email
    const snapshot = await adminDb
      .collection("inquiries")
      .where("email", "==", email)
      .get();

    // Always return success to prevent email enumeration
    if (snapshot.empty) {
      return NextResponse.json({ ok: true });
    }

    // Collect inquiry IDs and relevant info for the email
    const inquiryRows = snapshot.docs
      .filter((d) => {
        const status = d.data().status || "";
        // Only include inquiries that are still active / portal-eligible
        const allowed = [
          "Pending",
          "Approved Client",
          "Quotation Only",
          "Ongoing Quotation",
          "In Progress",
          "Service Not Offered",
        ];
        return allowed.includes(status);
      })
      .map((d) => ({
        id: d.id,
        serviceType: d.data().serviceType || "",
        status: d.data().status || "",
        name: d.data().name || d.data().fullName || "",
      }));

    if (inquiryRows.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const clientName = inquiryRows[0].name || "Client";

    // Build the HTML rows for each inquiry
    const rowsHtml = inquiryRows
      .map(
        (inq) => `
        <tr>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 13px; color: #1e40af; background: #eff6ff; border-radius: 4px;">
            <strong>${inq.id}</strong>
          </td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; text-transform: capitalize;">
            ${inq.serviceType || "—"}
          </td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155;">
            ${inq.status}
          </td>
        </tr>`
      )
      .join("");

    const rowsText = inquiryRows
      .map((inq) => `  Password: ${inq.id}  |  Service: ${inq.serviceType}  |  Status: ${inq.status}`)
      .join("\n");

    const emailText = `Dear ${clientName},

You requested your Client Portal password(s). Your password is your unique Inquiry ID listed below.

${rowsText}

To log in, visit: ${PORTAL_URL}

If you did not request this, please ignore this email.

Yours in utilizing OMICS for a better Philippines,
Philippine Genome Center Visayas`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px;">
          <h2 style="margin-top: 0; color: #1e40af; font-size: 18px;">Client Portal — Password Recovery</h2>
          <p>Dear <strong>${clientName}</strong>,</p>
          <p>You requested your Client Portal password(s). Your <strong>password is your unique Inquiry ID</strong> listed below.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #1e40af; color: #ffffff;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Password (Inquiry ID)</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Service</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <p style="margin: 20px 0 8px;">To access your portal, click the button below and sign in with your Google account, then paste your password from above:</p>
          <p style="margin: 16px 0;">
            <a href="${PORTAL_URL}" style="background-color: #1e40af; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px;">Open Client Portal</a>
          </p>

          <p style="font-size: 12px; color: #64748b; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            If you did not request this password recovery email, you can safely ignore it. No changes have been made to your account.
          </p>

          <p style="margin-top: 20px;">Yours in utilizing OMICS for a better Philippines,<br/><strong>Philippine Genome Center Visayas</strong></p>
        </div>
        <div style="margin-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
          This is an automated message. Please do not reply directly to this email.
        </div>
      </div>
    `;

    // Queue email via the Firestore mail extension
    await adminDb.collection("mail").add({
      to: [email],
      message: {
        subject: "Client Portal — Password Recovery",
        text: emailText,
        html: emailHtml,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("forgot-password route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
