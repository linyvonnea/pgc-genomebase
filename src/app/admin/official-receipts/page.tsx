"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

interface ReceiptRecord {
  orId: string;
  projectId?: string;
  date?: Timestamp | string | null;
  orNo?: string;
  orDate?: Timestamp | string | null;
  validatedBy?: string;
  validatedDate?: Timestamp | string | null;
  uploadStatus?: string;
  fileLink?: string;
}

function formatDate(value: Timestamp | string | null | undefined): string {
  if (!value) return "—";
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  return "—";
}

export default function OfficialReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "receipts"), orderBy("validatedDate", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          orId: doc.id,
          ...doc.data(),
        })) as ReceiptRecord[];
        setReceipts(data);
        setLoading(false);
      },
      () => {
        // If composite index missing, fall back without orderBy
        const q2 = query(collection(db, "receipts"));
        onSnapshot(q2, (snapshot) => {
          const data = snapshot.docs
            .map((doc) => ({ orId: doc.id, ...doc.data() } as ReceiptRecord))
            .sort((a, b) => {
              const aDate =
                a.validatedDate instanceof Timestamp
                  ? a.validatedDate.toMillis()
                  : a.validatedDate
                  ? new Date(a.validatedDate).getTime()
                  : 0;
              const bDate =
                b.validatedDate instanceof Timestamp
                  ? b.validatedDate.toMillis()
                  : b.validatedDate
                  ? new Date(b.validatedDate).getTime()
                  : 0;
              return bDate - aDate;
            });
          setReceipts(data);
          setLoading(false);
        });
      }
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Official Receipts</h1>
        <p className="text-sm text-gray-500">Validated official receipts from clients</p>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">OR ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">Date Uploaded</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">OR No.</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">OR Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">Validated By</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">Validated Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Loading receipts...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No official receipts found.
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt.orId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-800 whitespace-nowrap">
                      {receipt.orId}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(receipt.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                      {receipt.orNo || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(receipt.orDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {receipt.validatedBy || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(receipt.validatedDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          receipt.uploadStatus === "validated"
                            ? "bg-green-100 text-green-700"
                            : receipt.uploadStatus === "returned"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {receipt.uploadStatus ?? "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {receipt.fileLink ? (
                        <a
                          href={receipt.fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
