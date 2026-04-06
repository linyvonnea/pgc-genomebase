import ProjectDetailPageClient from "@/components/ProjectDetailPageClient";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function Page() {
  return (
    <PermissionGuard module="projects" action="view">
      <ProjectDetailPageClient />
    </PermissionGuard>
  );
}
