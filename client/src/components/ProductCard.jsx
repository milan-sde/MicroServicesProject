import { ShoppingCart, Trash2 } from 'lucide-react'

function ProductCard({ product, quantity, onQuantityChange, onOrder, isOrdering, onDelete, isDeleting, canDelete }) {
  return (
    <article className="glass-card p-5 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-amber-200/40">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{product.description || 'No description available'}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Stock: {product.stock ?? '-'}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-2xl font-extrabold text-teal-800">${Number(product.price).toFixed(2)}</p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Qty
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => onQuantityChange(product._id, e.target.value)}
            className="w-20 rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => onOrder(product)}
        disabled={isOrdering}
        className="btn-primary w-full gap-2"
      >
        <ShoppingCart className="h-4 w-4" />
        {isOrdering ? 'Placing Order...' : 'Place Order'}
      </button>

      {canDelete ? (
        <button
          type="button"
          onClick={() => onDelete(product)}
          disabled={isDeleting}
          className="btn-secondary mt-3 w-full gap-2 text-rose-700 hover:border-rose-200 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? 'Deleting...' : 'Delete Product'}
        </button>
      ) : null}
    </article>
  )
}

export default ProductCard
