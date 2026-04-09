import { useState } from 'react'
import { PlusCircle } from 'lucide-react'

const initialForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
}

function AdminProductForm({ onCreate, creating }) {
  const [form, setForm] = useState(initialForm)

  function onChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    await onCreate({
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
    })
    setForm(initialForm)
  }

  return (
    <section className="glass-card p-5">
      <h2 className="mb-4 text-lg font-bold text-slate-900">Admin: Add Product</h2>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="block md:col-span-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
          <input
            name="name"
            required
            value={form.name}
            onChange={onChange}
            className="input-field"
            placeholder="Product name"
          />
        </label>

        <label className="block md:col-span-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">Price</span>
          <input
            name="price"
            required
            min="0"
            step="0.01"
            type="number"
            value={form.price}
            onChange={onChange}
            className="input-field"
            placeholder="199.99"
          />
        </label>

        <label className="block md:col-span-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">Stock</span>
          <input
            name="stock"
            required
            min="0"
            type="number"
            value={form.stock}
            onChange={onChange}
            className="input-field"
            placeholder="50"
          />
        </label>

        <label className="block md:col-span-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
          <input
            name="description"
            value={form.description}
            onChange={onChange}
            className="input-field"
            placeholder="Short product description"
          />
        </label>

        <div className="md:col-span-2">
          <button type="submit" disabled={creating} className="btn-primary gap-2">
            <PlusCircle className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default AdminProductForm
