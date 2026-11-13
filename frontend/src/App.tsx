import { useState } from "react";

import { formatUpdatedAt, selectProducts, visibleCategories } from "@/lib/catalog";
import { useCatalog } from "@/hooks/useCatalog";
import { useDailyPrices } from "@/hooks/useDailyPrices";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { useSale } from "@/hooks/useSale";
import { Cart } from "@/components/pos/Cart";
import { CategoryBar } from "@/components/pos/CategoryBar";
import { ConnectionBadge } from "@/components/pos/ConnectionBadge";
import { DailyPricesTab } from "@/components/pos/DailyPricesTab";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { UpdateBanner } from "@/components/ui/UpdateBanner";

export default function App() {
  const [activeTab, setActiveTab] = useState<"sale" | "prices">("sale");
  const { catalog, origin, online, selectedCategory, selectCategory } = useCatalog();
  const dailyPrices = useDailyPrices(catalog);
  const sale = useSale(catalog, dailyPrices.rows, dailyPrices.canSave, dailyPrices.isToday);
  const { needRefresh, update, dismiss } = usePwaUpdate();

  const products = catalog?.products ?? [];
  const categories = catalog ? visibleCategories(catalog.categories, products) : [];
  const visibleProducts = catalog ? selectProducts(products, selectedCategory) : [];
  const updatedLabel = catalog ? formatUpdatedAt(catalog.updatedAt, new Date()) : null;
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

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
        <nav aria-label="Secciones" className="border-b border-stone-200 px-4 py-3">
          <div className="mx-auto flex max-w-6xl gap-2">
            <button
              type="button"
              aria-pressed={activeTab === "sale"}
              onClick={() => setActiveTab("sale")}
              className={`min-h-12 rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${activeTab === "sale" ? "bg-brand-600 text-white" : "bg-white text-stone-700 hover:bg-brand-50"}`}
            >
              Venta
            </button>
            <button
              type="button"
              aria-pressed={activeTab === "prices"}
              onClick={() => setActiveTab("prices")}
              className={`min-h-12 rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${activeTab === "prices" ? "bg-brand-600 text-white" : "bg-white text-stone-700 hover:bg-brand-50"}`}
            >
              Precios del día
            </button>
          </div>
        </nav>
        {activeTab === "prices" ? (
          <DailyPricesTab
            key={dailyPrices.businessDate ?? "sin-fecha"}
            catalog={catalog}
            rows={dailyPrices.rows}
            businessDate={dailyPrices.businessDate}
            loading={dailyPrices.loading}
            saving={dailyPrices.saving}
            canSave={dailyPrices.canSave}
            error={dailyPrices.error}
            onSave={dailyPrices.save}
          />
        ) : (
          <>
            <CategoryBar
              categories={categories}
              selected={selectedCategory}
              onSelect={selectCategory}
            />
            <ProductGrid
              products={visibleProducts}
              categories={categories}
              dailyPrices={dailyPrices.rows}
              loading={origin === "loading" || dailyPrices.loading}
              onSelect={(product) =>
                sale.addProduct(
                  product.id,
                  categoryNames.get(product.categoryId) ?? product.categoryId,
                )
              }
            />
            {updatedLabel ? (
              <p className="px-4 pb-6 text-xs text-stone-500">{updatedLabel}</p>
            ) : null}
            <Cart
              cart={sale.cart}
              dailyPrices={dailyPrices.rows}
              canCheckout={sale.canCheckout}
              saving={sale.saving}
              error={sale.error}
              success={sale.success}
              onAction={sale.dispatch}
              onCheckout={() => void sale.checkout()}
            />
          </>
        )}
      </main>
    </div>
  );
}
