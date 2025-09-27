import { Navigate, Route, Routes } from 'react-router-dom'
import Moderator from './components/docs/Moderator'
import Home from './components/Home'
import Navbar from './components/Navbar'
import NotFound from './components/NotFound'
import Prioritization from './components/Prioritization'
import ProtectedRoute from './components/routing/ProtectedRoute'
import SignIn from './components/SignIn'
import Updates from './components/Updates'
import CoachWorksheet from './components/worksheets/CoachWorksheet'
import ObserverWorksheet from './components/worksheets/ObserverWorksheet'
import PresenterWorksheet from './components/worksheets/PresenterWorksheet'

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={(
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          )}
        />
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/updates"
          element={(
            <ProtectedRoute>
              <Updates />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/prioritization"
          element={(
            <ProtectedRoute>
              <Prioritization />
            </ProtectedRoute>
          )}
        />
        <Route path="/documentation" element={<Navigate to="/documentation/moderator" replace />} />
        <Route
          path="/documentation/moderator"
          element={(
            <ProtectedRoute>
              <Moderator />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/worksheets/presenter"
          element={(
            <ProtectedRoute>
              <PresenterWorksheet />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/worksheets/coach"
          element={(
            <ProtectedRoute>
              <CoachWorksheet />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/worksheets/observer"
          element={(
            <ProtectedRoute>
              <ObserverWorksheet />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App
