import { useState } from "react";

import { formatUpdatedAt, selectProducts, visibleCategories } from "@/lib/catalog";
import { useCatalog } from "@/hooks/useCatalog";
import { useBackupStatus } from "@/hooks/useBackupStatus";
import { useDailyPrices } from "@/hooks/useDailyPrices";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { useReports } from "@/hooks/useReports";
import { useSale } from "@/hooks/useSale";
import { useSync } from "@/hooks/useSync";
import { Cart } from "@/components/pos/Cart";
import { CartFloatingButton } from "@/components/pos/CartFloatingButton";
import { CategoryBar } from "@/components/pos/CategoryBar";
import { ConnectionBadge } from "@/components/pos/ConnectionBadge";
import { AdminDialog } from "@/components/pos/AdminDialog";
import { BackupTab } from "@/components/pos/BackupTab";
import { DailyPricesTab } from "@/components/pos/DailyPricesTab";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { ProductSheet } from "@/components/pos/ProductSheet";
import { ReportsTab } from "@/components/pos/ReportsTab";
import { SyncBadge } from "@/components/pos/SyncBadge";
import { UpdateBanner } from "@/components/ui/UpdateBanner";
import { BrandMark } from "@/components/ui/BrandMark";
import { DeviceKeyDialog } from "@/components/ui/DeviceKeyDialog";
import type { Product } from "@/types/catalog";

type Tab = "sale" | "cart" | "prices" | "reports" | "backup";

const TABS: { id: Tab; label: string }[] = [
  { id: "sale", label: "Venta" },
  { id: "cart", label: "Carrito" },
  { id: "prices", label: "Precios del día" },
  { id: "reports", label: "Corte del día" },
  { id: "backup", label: "Respaldo" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("sale");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [deviceKeyOpen, setDeviceKeyOpen] = useState(false);
  const { catalog, origin, online, selectedCategory, selectCategory, refresh } = useCatalog();
  const backupOverdue = useBackupStatus();
  const sync = useSync({ online });
  const dailyPrices = useDailyPrices(catalog);
  const reports = useReports({
    businessDate: dailyPrices.businessDate,
    active: activeTab === "reports",
  });
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
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="h-1.5 bg-brand-600" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-300">
              <BrandMark className="size-10" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-brand-700">
                Pollería
              </p>
              <h1 className="truncate text-2xl font-black leading-none tracking-tight text-brand-700">
                El Wero
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SyncBadge
              pending={sync.pending}
              failed={sync.failed}
              syncing={sync.syncing}
              onRetry={() => void sync.retryFailed()}
            />
            <ConnectionBadge online={online} />
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              aria-label="Administración"
              className="grid size-12 place-items-center rounded-full border border-stone-300 bg-white text-stone-700"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current">
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  strokeWidth="1.8"
                />
                <path
                  d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.7 7.7 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6Z"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {sync.authRequired ? (
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-amber-900">
            <p>
              Falta la clave del local o es incorrecta. Las ventas siguen guardadas y se enviarán
              al configurarla.
            </p>
            <button
              type="button"
              onClick={() => setDeviceKeyOpen(true)}
              className="min-h-12 rounded-full bg-amber-900 px-4 font-bold text-white"
            >
              Configurar
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl">
        <nav aria-label="Secciones" className="border-b border-stone-200 py-3">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => {
              const label =
                tab.id === "cart" && sale.cart.lines.length > 0
                  ? `${tab.label} (${sale.cart.lines.length})`
                  : tab.id === "backup" && backupOverdue
                    ? `${tab.label} ⚠`
                    : tab.label;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-12 shrink-0 whitespace-nowrap rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${activeTab === tab.id ? "bg-brand-600 text-white" : "bg-white text-stone-700 hover:bg-brand-50"}`}
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
        ) : activeTab === "reports" ? (
          <ReportsTab
            key={dailyPrices.businessDate ?? "sin-fecha"}
            businessDate={dailyPrices.businessDate}
            report={reports.report}
            cut={reports.cut}
            unsynced={reports.unsynced}
            history={reports.history}
            remote={reports.remote}
            remoteLoading={reports.remoteLoading}
            loading={reports.loading}
            saving={reports.saving}
            error={reports.error}
            onSaveCash={reports.saveCash}
          />
        ) : activeTab === "backup" ? (
          <BackupTab />
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

      {activeTab === "sale" || activeTab === "prices" ? (
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

      {adminOpen ? (
        <AdminDialog
          onClose={() => setAdminOpen(false)}
          onPublished={() => void refresh()}
          onConfigureDeviceKey={() => {
            setAdminOpen(false);
            setDeviceKeyOpen(true);
          }}
        />
      ) : null}

      {deviceKeyOpen ? (
        <DeviceKeyDialog
          onClose={() => setDeviceKeyOpen(false)}
          onSaved={() => void sync.drain()}
        />
      ) : null}
    </div>
  );
}
