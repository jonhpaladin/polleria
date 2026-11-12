import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/pos/ProductCard";
import type { Category, Product } from "@/types/catalog";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
}

/** Rejilla mobile-first: una columna a 360 px, dos en sm y tres en lg. */
export function ProductGrid({ products, categories, loading }: ProductGridProps) {
  if (loading) {
    return <p className="px-4 py-10 text-center text-stone-600">Cargando catálogo…</p>;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No hay productos en esta categoría"
        description="Elige otra categoría o revisa el catálogo."
      />
    );
  }

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <section aria-labelledby="productos-title">
      <h2 id="productos-title" className="sr-only">
        Productos
      </h2>
      <div className="grid grid-cols-1 gap-3 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categoryName={categoryNames.get(product.categoryId) ?? product.categoryId}
          />
        ))}
      </div>
    </section>
  );
}
