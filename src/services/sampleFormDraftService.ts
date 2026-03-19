import { SampleFormData } from "@/types/SampleForm";

const API_BASE = "/api/sample-forms/draft";

export async function saveSampleFormDraft(inquiryId: string, data: SampleFormData) {
  if (!inquiryId) return;
  try {
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiryId, data }),
    });
  } catch (err) {
    console.error("Failed to save draft via API:", err);
    throw err;
  }
}

export async function getSampleFormDraft(inquiryId: string): Promise<SampleFormData | null> {
  if (!inquiryId) return null;
  try {
    const url = `${API_BASE}?inquiryId=${encodeURIComponent(inquiryId)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const payload = await res.json();
    return (payload?.data as SampleFormData) ?? null;
  } catch (err) {
    console.error("Failed to fetch draft via API:", err);
    return null;
  }
}

export async function deleteSampleFormDraft(inquiryId: string) {
  if (!inquiryId) return;
  try {
    await fetch(API_BASE, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiryId }),
    });
  } catch (err) {
    console.error("Failed to delete draft via API:", err);
    throw err;
  }
}
