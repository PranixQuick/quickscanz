import AppLayout from "@/components/layout/AppLayout";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function ProductsLoading() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-7 w-40 rounded-lg" />
            <div className="skeleton h-4 w-28 rounded-lg" />
          </div>
          <div className="skeleton h-9 w-20 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </AppLayout>
  );
}
