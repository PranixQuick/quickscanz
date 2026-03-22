import { SkeletonCard } from "@/components/ui/Skeleton";

export default function IoTHubLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-cream-200 rounded-xl" />
      <div className="h-12 bg-cream-200 rounded-2xl" />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
