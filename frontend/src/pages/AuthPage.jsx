// ============== src/pages/AuthPage.jsx ==============
// This page can be used for handling OAuth callbacks or showing messages
// For now, Supabase handles callbacks automatically if redirectTo is not set
// or if it points back to the app.
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for loading to finish before redirecting
    if (!loading) {
      if (user) {
        navigate('/'); // User is authenticated, go to home (onboarding will trigger if needed)
      } else {
        // If no user after auth attempt (e.g. callback error or direct access),
        // redirect to home, which will show login prompt.
        navigate('/'); 
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <p className="text-xl text-main-text">Processing authentication...</p>
      {/* You can add a spinner here */}
    </div>
  );
};

export default AuthPage;