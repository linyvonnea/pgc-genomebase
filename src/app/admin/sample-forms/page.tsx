import { getAllSampleForms } from "@/services/sampleFormService";
import { SampleFormClientTable } from "./SampleFormClientTable";
import { columns } from "./columns";
import { SampleFormRecord } from "@/types/SampleForm";
import { Timestamp } from "firebase/firestore";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Converts Firestore Timestamp, string, or Date → Date
function toDateSafe(value: string | Timestamp | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (value instanceof Timestamp) return value.toDate();
  return undefined;
}

export default async function SampleFormsAdminPage() {
  const rawData: SampleFormRecord[] = await getAllSampleForms();

  // Sort and process dates safely
  const data: SampleFormRecord[] = rawData.map((record) => ({
    ...record,
    createdAt: toDateSafe(record.createdAt),
    updatedAt: toDateSafe(record.updatedAt),
  }));

  return (
    <div className="container mx-auto py-5 space-y-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sample Form Management</h1>
          <p className="text-sm text-slate-500 font-medium">
            Review and track all submitted sample submission forms.
          </p>
        </div>
      </div>

      <SampleFormClientTable data={data} columns={columns} />
    </div>
  );
}
