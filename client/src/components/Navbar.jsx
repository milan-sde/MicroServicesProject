import { LogOut, Package2 } from 'lucide-react'

function Navbar({ userEmail, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-700 p-2 text-white shadow-md shadow-teal-700/30">
            <Package2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-900">Smart Order Management</p>
            <p className="text-xs text-slate-500">{userEmail || 'Signed in user'}</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="btn-secondary gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}

export default Navbar
