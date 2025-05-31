// src/components/feed/AiPulseDisplay.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Zap } from 'lucide-react';

const AiPulseDisplay = () => {
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPulse = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-ai-pulse');
        if (error) throw error;
        if (data) {
          setTrendingTopics(data);
        }
      } catch (error) {
        console.error("Error fetching AI pulse:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPulse();
  }, []);

  if (loading || trendingTopics.length === 0) {
    // Render nothing if loading or no topics, to keep the UI clean
    return null; 
  }

  return (
    <div className="py-4 mb-6 md:mb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 flex items-center bg-accent-teal/10 text-accent-teal px-3 py-1 rounded-full">
            <Zap size={16} className="mr-2" />
            <span className="font-bold text-sm uppercase tracking-wider">AI Pulse</span>
          </div>
          <div className="flex-grow relative h-8 overflow-hidden">
            {/* Using a CSS animation for a continuous scroll effect */}
            <div className="absolute top-0 left-0 flex items-center h-full animate-marquee whitespace-nowrap">
              {trendingTopics.concat(trendingTopics).map((topic, index) => ( // Duplicate the list for a seamless loop
                <span key={index} className="text-sm text-main-text/80 mx-4">
                  #{topic.topic_text.replace(/\s+/g, '-')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiPulseDisplay;