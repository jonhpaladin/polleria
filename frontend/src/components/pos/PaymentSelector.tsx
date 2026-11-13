import { PAYMENT_LABEL, PAYMENT_METHODS } from "@/lib/payment";
import type { PaymentMethod } from "@/types/sale";

interface PaymentSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

export function PaymentSelector({ value, onChange }: PaymentSelectorProps) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-2 text-sm font-bold text-stone-900">Método de pago</legend>
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method}
            type="button"
            aria-pressed={value === method}
            onClick={() => onChange(method)}
            className={`min-h-12 rounded-xl border px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${value === method ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}
          >
            {PAYMENT_LABEL[method]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
