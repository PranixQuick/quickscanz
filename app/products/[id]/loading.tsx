import AppLayout from "@/components/layout/AppLayout";

export default function ProductDetailLoading() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="skeleton h-4 w-28 rounded-lg" />
        <div className="card p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="skeleton h-7 w-52 rounded-lg" />
              <div className="skeleton h-4 w-24 rounded-lg" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="flex justify-center py-4">
            <div className="skeleton w-28 h-28 rounded-full" />
          </div>
        </div>
        <div className="card p-5 space-y-4">
          <div className="skeleton h-5 w-36 rounded-lg" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-cream-100">
              <div className="skeleton h-4 w-20 rounded-lg" />
              <div className="skeleton h-4 w-28 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="card p-5 space-y-4">
          <div className="skeleton h-5 w-40 rounded-lg" />
          <div className="skeleton h-32 w-full rounded-xl" />
        </div>
      </div>
    </AppLayout>
  );
}
