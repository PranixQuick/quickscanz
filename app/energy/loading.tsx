import { SkeletonCard, SkeletonStats } from "@/components/ui/Skeleton";

export default function EnergyLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-52 bg-cream-200 rounded-xl" />
      <SkeletonStats />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
