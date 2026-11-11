import { DashboardSkeleton } from "@/features/statistics/DashboardSkeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <DashboardSkeleton />
    </div>
  );
}
