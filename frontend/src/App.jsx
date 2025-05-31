// ============== src/App.jsx ==============
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage'; 

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/callback" element={<AuthPage />} /> 
            {/* <Route path="/profile" element={<ProfilePage />} /> Placeholder for actual profile page */}
            {/* <Route path="/events" element={<EventsPage />} /> Placeholder */}
            {/* <Route path="/videos" element={<VideosPage />} /> Placeholder */}
            {/* <Route path="/discover" element={<DiscoverPage />} /> Placeholder */}
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;