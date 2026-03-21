import { getProductIntelligence } from "@/lib/intelligence";

interface ProductIntelligenceCardProps {
  name: string;
  brand: string;
}

export default function ProductIntelligenceCard({ name, brand }: ProductIntelligenceCardProps) {
  const intel = getProductIntelligence(name, brand);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-xl">{intel.categoryIcon}</span>
        <div>
          <h2 className="font-display text-base font-light text-ink-700">{intel.category}</h2>
          <p className="text-xs text-ink-400">{intel.warrantyType}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-cream-100">
          <span className="text-xs text-ink-400">Typical lifespan</span>
          <span className="text-sm font-medium text-ink-800">{intel.estimatedLifespanYears}</span>
        </div>
        <div className="p-3 bg-cream-100 rounded-xl">
          <p className="text-xs text-ink-400 mb-1 font-medium">💡 Pro tip</p>
          <p className="text-xs text-ink-600 leading-relaxed">{intel.tipWhenWorking}</p>
        </div>
      </div>
      <p className="text-[10px] text-ink-300 mt-3 text-right">Based on product category</p>
    </div>
  );
}
