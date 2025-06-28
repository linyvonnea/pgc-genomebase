import { mockQuotations } from "@/mock/mockQuotations";
import { mockClients } from "@/mock/mockClients";
import { Button } from "@/components/ui/button";

export default function AdminQuotationsPage() {
  return (
    <div className="p-4 bg-white rounded shadow">
      <h1 className="text-xl font-bold mb-4">Quotations</h1>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Quotation ID</th>
            <th className="p-2 border">Client</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {mockQuotations.map((quote) => {
            const client = mockClients.find(c => c.id === quote.clientId);
            return (
              <tr key={quote.id}>
                <td className="p-2 border">{quote.id}</td>
                <td className="p-2 border">{client?.name || "Unknown"}</td>
                <td className="p-2 border">{quote.type}</td>
                <td className="p-2 border">₱{quote.total.toLocaleString()}</td>
                <td className="p-2 border">{quote.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}