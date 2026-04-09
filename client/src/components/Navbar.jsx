import { LogOut, Package2 } from 'lucide-react'

function Navbar({ userEmail, userName, onLogout }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-700 p-2 text-white shadow-md shadow-teal-700/30">
            <Package2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Smart Order Management</p>
            <p className="text-xs text-slate-500">{userName || userEmail || 'Signed in user'}</p>
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
