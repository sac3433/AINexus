// src/components/Layout.jsx
import React from 'react';
import Header from './Header.jsx'; // Corrected import path
import Footer from './Footer.jsx';   // Corrected import path
import OnboardingModal from './onboarding/OnboardingModal.jsx'; // Corrected import path
import { useAuth } from '../contexts/AuthContext.jsx'; // Corrected import path

const Layout = ({ children }) => {
  const { showOnboarding, user, loading } = useAuth();
  
  const shouldShowOnboarding = user && showOnboarding && !loading;

  return (
    <div className="flex flex-col min-h-screen"> {/* This div will have the body's fixed background */}
      <Header />
      {/* The <main> tag no longer has 'container mx-auto' or padding.
        The page component itself (e.g., HomePage.jsx) will now manage
        whether its content is full-width or contained.
      */}
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      {shouldShowOnboarding && <OnboardingModal isOpen={true} onClose={() => { /* Onboarding modal handles its own close */ }} />}
    </div>
  );
};

export default Layout;
