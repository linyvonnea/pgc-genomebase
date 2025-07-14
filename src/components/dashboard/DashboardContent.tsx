//src/components/dashboard/DashboardContent.tsx
import { StatCard } from "@/components/dashboard/StatCard";
import { StatBarChart } from "@/components/dashboard/StatBarChart";
import { ServiceRequestedChart } from "@/components/dashboard/ServiceRequestedChart";
import { SendingInstitutionChart } from "@/components/dashboard/SendingInstitutionChart";
import { FundingCategoryChart } from "@/components/dashboard/FundingCategoryChart";

export function DashboardContent({
  filteredProjects,
  filteredClients,
  filteredTrainings,
  totalIncome,
  timeRange,
  customRange
}: any) {
  return (
    <>
      <div className="gap-4 mb-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <StatCard title="Total Clients" value={filteredClients.length} colorIndex={0} />
            <StatCard title="Total Projects" value={filteredProjects.length} colorIndex={1} />
            <StatCard title="Total Trainings" value={filteredTrainings.length} colorIndex={2} />
            <StatCard
              title="Total Income"
              value={totalIncome.toLocaleString("en-PH", {
                style: "currency",
                currency: "PHP",
              })}
              colorIndex={3}
            />
          </div>
        </div>
        <div className="h-[400px]">
          <StatBarChart
            projectsData={filteredProjects}
            clientsData={filteredClients}
            trainingsData={filteredTrainings}
            timeRange={timeRange}
            customRange={customRange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ServiceRequestedChart projects={filteredProjects} />
        <SendingInstitutionChart projects={filteredProjects} />
        <FundingCategoryChart projects={filteredProjects} />
      </div>
    </>
  );
}
