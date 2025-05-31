// src/pages/HomePage.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EventsBanner from '../components/feed/EventsBanner.jsx';
import AiPulseDisplay from '../components/feed/AiPulseDisplay.jsx';
import VideoInsights from '../components/feed/VideoInsights.jsx';
import NewsFeed from '../components/feed/NewsFeed.jsx';

const HomePage = () => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-teal mb-4"></div>
        <p className="text-lg text-main-text/80">Loading your AI Nexus experience...</p>
      </div>
    );
  }

  return (
    <> {/* Use a Fragment to avoid an unnecessary div if Layout handles main page styling */}
      {/* Section 1: Events Banner (Visible to all) */}
      <EventsBanner />
      
      {/* Main Content Wrapper - Now with a solid background */}
      {/* Ensure 'bg-warm-off-white' is defined in your tailwind.config.js (e.g., for #FAF7F2) 
          or use a standard Tailwind class like 'bg-white' or 'bg-slate-50'. 
      */}
      <div className="bg-warm-off-white"> {/* UPDATED: Removed opacity and backdrop-blur */}
        <div className="container mx-auto px-2 sm:px-4 py-4 md:py-6">
          {/* Section 2: AI Pulse Ticker (Visible to all) */}
          <AiPulseDisplay />

          {/* Section 3: Personalized Feed (Primary content for logged-in users) */}
          <div className="mt-8 md:mt-12">
            <h2 className="text-2xl md:text-3xl font-bold text-heading-text mb-6 text-center md:text-left">
              {user ? "Your Personalized AI Feed" : "Latest in AI"}
            </h2>
            
            {user ? (
              <NewsFeed />
            ) : (
              <div className="bg-card-bg p-8 rounded-lg shadow-md text-center border-t-4 border-accent-teal">
                <p className="text-main-text text-lg font-semibold">
                  Log in to unlock your personalized AI intelligence feed.
                </p>
                <p className="text-main-text/80 mt-2">
                  Get insights tailored to your role and interests.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Video Insights (Visible to all) */}
          <VideoInsights />
        </div>
      </div>

      {/* Section 5: Background Image Reveal Spacer */}
      {/* This div is transparent and tall enough to let the fixed body background show through */}
      <div className="min-h-[50vh] md:min-h-[70vh] relative">
        {/* Optional: Gradient overlay like Google I/O's page at the top of this reveal area */}
        {/* This helps blend the content section above into the revealed background image */}
        <div className="absolute inset-x-0 top-0 h-48 md:h-64 bg-gradient-to-b from-warm-off-white to-transparent pointer-events-none"></div>
        
        {/* Optional: Add your "Google I/O 25" like logo/text overlaid here if desired */}
        {/* <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-10 text-center">
            <h1 className="text-5xl font-bold text-white shadow-text">AI Nexus</h1>
        </div> */}
      </div>
      {/* Your main application Footer will render after this, appearing over the revealed background */}
    </>
  );
};

export default HomePage;
