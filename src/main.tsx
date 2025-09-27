import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import './index.css'

const theme = createTheme({
  palette: {
    mode: 'light',
    // Globis-like deep blue
    primary: {
      main: '#1b2c6b',
      light: '#2f3f86',
      dark: '#142051',
      contrastText: '#ffffff',
    },
    // Accent red inspired by the logo accent
    secondary: {
      main: '#c62828',
      light: '#e35151',
      dark: '#8e0000',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['"Noto Sans JP"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
  },
  components: {
    // Keep original casing for buttons globally (already applied in Navbar, this makes it consistent app-wide)
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.error('Service worker registration failed:', error)
      })
  })
}
