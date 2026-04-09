import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import AdminProductForm from '../components/AdminProductForm'
import OrderCard from '../components/OrderCard'

function DashboardPage({ auth }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [orders, setOrders] = useState([])
  const [profile, setProfile] = useState(auth.user)
  const [productsLoading, setProductsLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [orderingProductId, setOrderingProductId] = useState(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState(null)

  const isAdmin = (profile?.role || auth.user?.role) === 'admin'

  useEffect(() => {
    fetchProducts()
    fetchOrders()
    fetchProfile()
  }, [])

  async function fetchProducts() {
    setProductsLoading(true)
    try {
      const { data } = await api.get('/products')
      const items = data.products || []
      setProducts(items)

      const initial = {}
      for (const item of items) {
        initial[item._id] = 1
      }
      setQuantities(initial)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch products')
    } finally {
      setProductsLoading(false)
    }
  }

  async function fetchOrders() {
    setOrdersLoading(true)
    try {
      const userId = auth.user?.id || auth.user?._id
      const { data } = await api.get('/orders', { params: userId ? { userId } : undefined })
      setOrders(data.orders || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch orders')
    } finally {
      setOrdersLoading(false)
    }
  }

  async function fetchProfile() {
    setProfileLoading(true)
    try {
      const nextProfile = await auth.refreshProfile()
      if (nextProfile) {
        setProfile(nextProfile)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch profile')
    } finally {
      setProfileLoading(false)
    }
  }

  function onLogout() {
    auth.logout()
    toast.success('Logged out')
    navigate('/auth', { replace: true })
  }

  function onQuantityChange(productId, value) {
    const next = Number(value)
    setQuantities((prev) => ({
      ...prev,
      [productId]: Number.isFinite(next) && next > 0 ? Math.floor(next) : 1,
    }))
  }

  async function placeOrder(product) {
    const userId = profile?.id || profile?._id || auth.user?.id || auth.user?._id
    if (!userId) {
      toast.error('User profile unavailable. Please login again.')
      return
    }

    const quantity = quantities[product._id] || 1
    setOrderingProductId(product._id)

    try {
      await api.post('/orders', {
        userId,
        products: [
          {
            productId: product._id,
            productName: product.name,
            quantity,
            price: Number(product.price),
          },
        ],
      })

      toast.success('Order placed successfully')
      await fetchProducts()
      await fetchOrders()
    } catch (error) {
      const message = error.response?.data?.message || 'Order failed'
      toast.error(message)
    } finally {
      setOrderingProductId(null)
    }
  }

  async function createProduct(payload) {
    setCreatingProduct(true)
    try {
      await api.post('/products', payload)
      toast.success('Product created successfully')
      await fetchProducts()
      setActiveTab('products')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create product')
    } finally {
      setCreatingProduct(false)
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(`Delete ${product.name}? This will remove it from the catalog.`)
    if (!confirmed) {
      return
    }

    setDeletingProductId(product._id)
    try {
      await api.delete(`/products/${product._id}`)
      toast.success('Product deleted successfully')
      await fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product')
    } finally {
      setDeletingProductId(null)
    }
  }

  const productGrid = useMemo(() => {
    if (!products.length && !productsLoading) {
      return (
        <div className="glass-card py-12 text-center text-slate-600">
          No products available yet.
        </div>
      )
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            quantity={quantities[product._id] || 1}
            onQuantityChange={onQuantityChange}
            onOrder={placeOrder}
            isOrdering={orderingProductId === product._id}
            onDelete={deleteProduct}
            isDeleting={deletingProductId === product._id}
            canDelete={isAdmin}
          />
        ))}
      </div>
    )
  }, [products, quantities, productsLoading, orderingProductId, deletingProductId, isAdmin])

  const orderList = useMemo(() => {
    if (!orders.length && !ordersLoading) {
      return (
        <div className="glass-card py-12 text-center text-slate-600">
          No orders found yet.
        </div>
      )
    }

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {orders.map((order) => (
          <OrderCard key={order._id} order={order} />
        ))}
      </div>
    )
  }, [orders, ordersLoading])

  return (
    <div className="min-h-screen">
      <Navbar userEmail={auth.user?.email} onLogout={onLogout} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Product Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Complete control panel for products, orders, and user profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={fetchProducts} className="btn-secondary">
              Refresh Products
            </button>
            <button type="button" onClick={fetchOrders} className="btn-secondary">
              Refresh Orders
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 rounded-xl border border-stone-200 bg-white/70 p-1 text-sm font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`rounded-lg px-3 py-2 transition ${
              activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : ''
            }`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`rounded-lg px-3 py-2 transition ${
              activeTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : ''
            }`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`rounded-lg px-3 py-2 transition ${
              activeTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : ''
            }`}
          >
            Profile
          </button>
        </div>

        {activeTab === 'products' ? (
          <div className="space-y-4">
            {isAdmin ? <AdminProductForm onCreate={createProduct} creating={creatingProduct} /> : null}
            {productsLoading ? <Spinner label="Loading products..." /> : productGrid}
          </div>
        ) : null}

        {activeTab === 'orders' ? (
          ordersLoading ? <Spinner label="Loading orders..." /> : orderList
        ) : null}

        {activeTab === 'profile' ? (
          profileLoading ? (
            <Spinner label="Loading profile..." />
          ) : (
            <section className="glass-card max-w-xl p-6">
              <h2 className="text-xl font-bold text-slate-900">User Profile</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-slate-500">Username</dt>
                  <dd className="text-slate-900">{profile?.username || '-'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Email</dt>
                  <dd className="text-slate-900">{profile?.email || '-'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Role</dt>
                  <dd className="inline-flex rounded-full bg-teal-100 px-2 py-1 font-semibold uppercase text-teal-800">
                    {profile?.role || 'user'}
                  </dd>
                </div>
              </dl>
            </section>
          )
        ) : null}
      </main>
    </div>
  )
}

export default DashboardPage
