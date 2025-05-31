// src/components/feed/VideoInsights.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import VideoCard from './VideoCard.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// The VideoCarousel helper component remains the same
const VideoCarousel = ({ channel }) => {
  const scrollContainerRef = React.useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.offsetWidth * 0.75;
      scrollContainerRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  if (!channel || !channel.videos || channel.videos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-xl md:text-2xl font-bold text-heading-text mb-4">
        Latest from <span className="text-accent-teal">{channel.channel_name}</span>
      </h3>
      <div className="relative flex items-center">
        {channel.videos.length > 2 && (
            <button 
            onClick={() => scroll('left')}
            className="absolute -left-3 md:-left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-card-bg/80 hover:bg-card-bg text-main-text rounded-full shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-accent-teal hidden md:flex"
            aria-label="Scroll left"
            >
            <ChevronLeft size={24} />
            </button>
        )}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto scroll-smooth py-2 space-x-4 snap-x snap-mandatory no-scrollbar"
        >
          {channel.videos.map((video) => (
            <VideoCard key={video.video_url || video.id} video={video} />
          ))}
        </div>
        {channel.videos.length > 2 && (
            <button 
            onClick={() => scroll('right')}
            className="absolute -right-3 md:-right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-card-bg/80 hover:bg-card-bg text-main-text rounded-full shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-accent-teal hidden md:flex"
            aria-label="Scroll right"
            >
            <ChevronRight size={24} />
            </button>
        )}
      </div>
    </div>
  );
};


// This is the main component
const VideoInsights = () => {
  const [videoSections, setVideoSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideoInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- FIX: Explicitly use the GET method ---
        const { data, error: funcError } = await supabase.functions.invoke('get-video-insights', {
          method: 'GET',
        });
        
        if (funcError) {
          const errorMessage = funcError.context?.msg || funcError.message || "An unknown error occurred fetching videos.";
          throw new Error(errorMessage);
        }
        
        if (data && Array.isArray(data)) {
          setVideoSections(data);
        } else {
          setVideoSections([]);
        }

      } catch (err) {
        console.error("Error fetching video insights:", err);
        setError("Could not load video insights.");
      } finally {
        setLoading(false);
      }
    };
    fetchVideoInsights();
  }, []);

  if (loading) {
    return (
        <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-teal mx-auto mb-2"></div>
            <p className="text-main-text/70">Loading Video Insights...</p>
        </div>
    );
  }

  if (error) {
    return null; // Don't show the section if it fails
  }

  if (videoSections.length === 0) {
    return null; // Don't render the section if there are no videos
  }

  return (
    <div className="mt-8 md:mt-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-heading-text mb-2">
          Video Insights
        </h2>
        <p className="text-main-text/80 max-w-2xl mx-auto">
          Catch up on the latest video updates and announcements from leading AI companies.
        </p>
      </div>
      {videoSections.map((channel) => (
        <VideoCarousel key={channel.channel_name} channel={channel} />
      ))}
    </div>
  );
};

export default VideoInsights;
