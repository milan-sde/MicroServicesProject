import { Hash, Wallet } from 'lucide-react'
import StatusBadge from './StatusBadge'

function OrderCard({ order }) {
  return (
    <article className="glass-card rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="mb-4 flex justify-between items-start gap-3">
        <div className="min-w-0 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Hash className="h-4 w-4" />
          <span className="truncate">Order #{order._id}</span>
        </div>
        <div className="shrink-0">
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-700">
        {order.products?.map((item) => (
          <div
            key={item._id || `${item.productId}-${item.quantity}`}
            className="rounded-xl bg-stone-50 px-3 py-2.5"
          >
            <p className="font-semibold text-slate-900">{item.productName || item.productId}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Quantity: {item.quantity} x ${Number(item.price).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="inline-flex items-center gap-1 font-semibold text-slate-800">
          <Wallet className="h-4 w-4" />
          Total: ${Number(order.totalAmount).toFixed(2)}
        </p>
        <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
      </div>

      {order.transactionId ? (
        <p className="mt-2 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs text-teal-700">
          Transaction ID: {order.transactionId}
        </p>
      ) : null}
    </article>
  )
}

export default OrderCard
