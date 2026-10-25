import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Approvals } from './pages/Approvals'
import { Audit } from './pages/Audit'
import { Health } from './pages/Health'
import { IncidentDetail } from './pages/IncidentDetail'
import { IncidentReview } from './pages/IncidentReview'
import { Overview } from './pages/Overview'
import { Search } from './pages/Search'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="page">
      <div className="empty-state">
        <h1>Page not found</h1>
        <p className="muted">This view does not exist in the console.</p>
        <Link to="/" className="btn">
          Go to Overview
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Shell>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/incidents" element={<IncidentReview />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/health" element={<Health />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
