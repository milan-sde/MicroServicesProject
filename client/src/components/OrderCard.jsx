import { CircleCheckBig, CircleX, Hash, Wallet } from 'lucide-react'

function OrderCard({ order }) {
  const statusOk = order.status === 'completed'

  return (
    <article className="glass-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Hash className="h-4 w-4" />
          {order._id}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            statusOk
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {statusOk ? <CircleCheckBig className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
          {order.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-700">
        {order.products?.map((item) => (
          <div key={item._id || `${item.productId}-${item.quantity}`} className="rounded-lg bg-stone-50 px-3 py-2">
            <p className="font-semibold text-slate-900">{item.productName || item.productId}</p>
            <p>Qty: {item.quantity} x ${Number(item.price).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="inline-flex items-center gap-1 font-semibold text-slate-800">
          <Wallet className="h-4 w-4" />
          Total: ${Number(order.totalAmount).toFixed(2)}
        </p>
        <p className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
      </div>

      {order.transactionId ? (
        <p className="mt-2 text-xs text-teal-700">Transaction: {order.transactionId}</p>
      ) : null}
    </article>
  )
}

export default OrderCard
