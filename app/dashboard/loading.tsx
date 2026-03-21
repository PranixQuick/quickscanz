import AppLayout from "@/components/layout/AppLayout";
import { SkeletonCard, SkeletonStats } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-7 w-48 rounded-xl" />
          <div className="skeleton h-4 w-64 rounded-lg" />
        </div>
        <SkeletonStats />
        <div className="space-y-3">
          <div className="skeleton h-4 w-32 rounded-lg" />
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </AppLayout>
  );
}
