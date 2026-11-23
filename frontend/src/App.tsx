import { useState } from "react";

import { formatUpdatedAt, selectProducts, visibleCategories } from "@/lib/catalog";
import { useCatalog } from "@/hooks/useCatalog";
import { useDailyPrices } from "@/hooks/useDailyPrices";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { useSale } from "@/hooks/useSale";
import { useSync } from "@/hooks/useSync";
import { Cart } from "@/components/pos/Cart";
import { CartFloatingButton } from "@/components/pos/CartFloatingButton";
import { CategoryBar } from "@/components/pos/CategoryBar";
import { ConnectionBadge } from "@/components/pos/ConnectionBadge";
import { DailyPricesTab } from "@/components/pos/DailyPricesTab";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { ProductSheet } from "@/components/pos/ProductSheet";
import { SyncBadge } from "@/components/pos/SyncBadge";
import { UpdateBanner } from "@/components/ui/UpdateBanner";
import type { Product } from "@/types/catalog";

type Tab = "sale" | "cart" | "prices";

const TABS: { id: Tab; label: string }[] = [
  { id: "sale", label: "Venta" },
  { id: "cart", label: "Carrito" },
  { id: "prices", label: "Precios del día" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("sale");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { catalog, origin, online, selectedCategory, selectCategory } = useCatalog();
  const sync = useSync({ online });
  const dailyPrices = useDailyPrices(catalog);
  const sale = useSale(
    catalog,
    dailyPrices.rows,
    dailyPrices.canSave,
    dailyPrices.isToday,
    dailyPrices.businessDate,
    sync.nudge,
  );
  const { needRefresh, update, dismiss } = usePwaUpdate();

  const products = catalog?.products ?? [];
  const categories = catalog ? visibleCategories(catalog.categories, products) : [];
  const visibleProducts = catalog ? selectProducts(products, selectedCategory) : [];
  const updatedLabel = catalog ? formatUpdatedAt(catalog.updatedAt, new Date()) : null;
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const selectedCategoryName = selectedProduct
    ? (categoryNames.get(selectedProduct.categoryId) ?? selectedProduct.categoryId)
    : "";
  const selectedDailyPrice = selectedProduct
    ? dailyPrices.rows.find((row) => row.productId === selectedProduct.id)
    : undefined;

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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SyncBadge
              pending={sync.pending}
              failed={sync.failed}
              syncing={sync.syncing}
              onRetry={() => void sync.retryFailed()}
            />
            <ConnectionBadge online={online} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl">
        <nav aria-label="Secciones" className="border-b border-stone-200 px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
            {TABS.map((tab) => {
              const label =
                tab.id === "cart" && sale.cart.lines.length > 0
                  ? `${tab.label} (${sale.cart.lines.length})`
                  : tab.label;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-12 whitespace-nowrap rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${activeTab === tab.id ? "bg-brand-600 text-white" : "bg-white text-stone-700 hover:bg-brand-50"}`}
                >
                  {label}
                </button>
              );
            })}
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
        ) : activeTab === "cart" ? (
          <Cart
            cart={sale.cart}
            dailyPrices={dailyPrices.rows}
            canCheckout={sale.canCheckout}
            saving={sale.saving}
            error={sale.error}
            success={sale.success}
            onAction={sale.dispatch}
            onCheckout={() => void sale.checkout()}
            onBackToSale={() => setActiveTab("sale")}
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
              onSelect={(product) => setSelectedProduct(product)}
            />
            {updatedLabel ? (
              <p className="px-4 pb-24 text-xs text-stone-500">{updatedLabel}</p>
            ) : null}
          </>
        )}
      </main>

      {activeTab !== "cart" ? (
        <CartFloatingButton
          count={sale.cart.lines.length}
          onOpen={() => setActiveTab("cart")}
        />
      ) : null}

      {selectedProduct ? (
        <ProductSheet
          product={selectedProduct}
          categoryName={selectedCategoryName}
          dailyPrice={selectedDailyPrice}
          canSell={dailyPrices.isToday && dailyPrices.canSave}
          onAdd={(selection) =>
            sale.addProduct(selectedProduct.id, selectedCategoryName, selection)
          }
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </div>
  );
}
