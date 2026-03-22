import { SkeletonCard } from "@/components/ui/Skeleton";

export default function AccountLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-36 bg-cream-200 rounded-xl" />
      <div className="h-24 bg-cream-200 rounded-2xl" />
      <SkeletonCard />
    </div>
  );
}
