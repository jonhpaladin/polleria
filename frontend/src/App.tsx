import { formatUpdatedAt, selectProducts, visibleCategories } from "@/lib/catalog";
import { useCatalog } from "@/hooks/useCatalog";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { CategoryBar } from "@/components/pos/CategoryBar";
import { ConnectionBadge } from "@/components/pos/ConnectionBadge";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { UpdateBanner } from "@/components/ui/UpdateBanner";

export default function App() {
  const { catalog, origin, online, selectedCategory, selectCategory } = useCatalog();
  const { needRefresh, update, dismiss } = usePwaUpdate();

  const products = catalog?.products ?? [];
  const categories = catalog ? visibleCategories(catalog.categories, products) : [];
  const visibleProducts = catalog ? selectProducts(products, selectedCategory) : [];
  const updatedLabel = catalog ? formatUpdatedAt(catalog.updatedAt, new Date()) : null;

  return (
    <div className="min-h-dvh bg-cream-50">
      <UpdateBanner visible={needRefresh} onUpdate={update} onDismiss={dismiss} />
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              Pollería
            </p>
            <h1 className="text-2xl font-black tracking-tight text-stone-900">el wero</h1>
          </div>
          <ConnectionBadge online={online} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl">
        <CategoryBar
          categories={categories}
          selected={selectedCategory}
          onSelect={selectCategory}
        />
        <ProductGrid
          products={visibleProducts}
          categories={categories}
          loading={origin === "loading"}
        />
        {updatedLabel ? (
          <p className="px-4 pb-6 text-xs text-stone-500">{updatedLabel}</p>
        ) : null}
      </main>
    </div>
  );
}
