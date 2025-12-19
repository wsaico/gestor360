import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@contexts/AuthContext'
import { NotificationProvider } from '@contexts/NotificationContext'
import { ThemeProvider } from '@contexts/ThemeContext'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
