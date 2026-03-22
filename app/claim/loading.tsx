import { CardSkeleton } from "@/components/ui/Skeleton";

export default function ClaimLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-56 bg-cream-200 rounded-xl" />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
