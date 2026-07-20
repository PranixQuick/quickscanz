import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/actions/products";
import { getPriceHistory, getMaintenanceTasks } from "@/lib/actions/phase2";
import AppLayout from "@/components/layout/AppLayout";
import ProductDetailClient from "@/components/products/ProductDetailClient";
import WarrantySpeakCard from "@/components/products/WarrantySpeakCard";
import AariaAssistantButton from "@/components/ui/AariaAssistantButton";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description: `Warranty details for ${product.name} by ${product.brand}.`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  const [priceHistory, maintenanceTasks] = await Promise.all([
    getPriceHistory(params.id),
    getMaintenanceTasks(params.id),
  ]);

  return (
    <AppLayout>
      <ProductDetailClient
        product={product}
        priceHistory={priceHistory}
        maintenanceTasks={maintenanceTasks}
      />
      <div className="mt-5">
        <WarrantySpeakCard product={product} />
      </div>
      <div className="mt-3">
        <AariaAssistantButton />
      </div>
    </AppLayout>
  );
}
