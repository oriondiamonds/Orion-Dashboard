import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { getAccessibleModules, ROLE_LABELS } from '../auth/permissions.js'
import {
  BarChart3,
  ShoppingCart,
  Package,
  Tag,
  Building2,
  IndianRupee,
  Users,
  LogOut,
  Diamond,
} from 'lucide-react'

const MODULE_NAV = {
  tracking: { label: 'Tracking', icon: BarChart3, path: '/tracking' },
  orders: { label: 'Orders', icon: ShoppingCart, path: '/orders' },
  products: { label: 'Products', icon: Package, path: '/products' },
  coupons: { label: 'Coupons', icon: Tag, path: '/coupons' },
  agencies: { label: 'Agencies', icon: Building2, path: '/agencies' },
  pricing: { label: 'Pricing', icon: IndianRupee, path: '/pricing' },
  'admin-users': { label: 'Admin Users', icon: Users, path: '/admin-users' },
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const modules = getAccessibleModules(user.role)

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col h-screen sticky top-0 shrink-0 overflow-y-auto">
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Diamond className="w-6 h-6 text-indigo-400" />
          <span className="font-bold text-lg">Orion</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {modules.map((mod) => {
          const nav = MODULE_NAV[mod]
          if (!nav) return null
          const Icon = nav.icon
          return (
            <NavLink
              key={mod}
              to={nav.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {nav.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <div className="px-3 mb-3">
          <p className="text-sm font-medium truncate">{user.display_name}</p>
          <p className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
