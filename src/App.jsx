import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import LoginPage from './auth/LoginPage.jsx'
import Layout from './components/Layout.jsx'
import TrackingPage from './modules/tracking/TrackingPage.jsx'
import OrdersPage from './modules/orders/OrdersPage.jsx'

// Placeholder pages — will be replaced as each module is built
function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500">This module is coming soon.</p>
    </div>
  )
}

function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">403</h1>
        <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
        <a href="/" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}

function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500">Welcome to the Orion Admin Dashboard. Select a module from the sidebar.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/403" element={<ForbiddenPage />} />

            {/* Protected layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />

              <Route
                path="tracking"
                element={
                  <ProtectedRoute module="tracking">
                    <TrackingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders"
                element={
                  <ProtectedRoute module="orders">
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="products"
                element={
                  <ProtectedRoute module="products">
                    <PlaceholderPage title="Products" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="coupons"
                element={
                  <ProtectedRoute module="coupons">
                    <PlaceholderPage title="Coupons" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="agencies"
                element={
                  <ProtectedRoute module="agencies">
                    <PlaceholderPage title="Agencies" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pricing"
                element={
                  <ProtectedRoute module="pricing">
                    <PlaceholderPage title="Pricing Configuration" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin-users"
                element={
                  <ProtectedRoute module="admin-users">
                    <PlaceholderPage title="Admin Users" />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
