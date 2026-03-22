import { CardSkeleton } from "@/components/ui/Skeleton";

export default function AddProductLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-cream-200 rounded-xl" />
      <CardSkeleton />
    </div>
  );
}
