// src/components/feed/EventsBanner.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path if needed
import { ExternalLink, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade'; // Or other effects like 'effect-coverflow'

// import required modules
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';

const EventsBanner = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Navigation refs for Swiper
  const navigationPrevRef = React.useRef(null);
  const navigationNextRef = React.useRef(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: funcError } = await supabase.functions.invoke('get-ai-events');
        if (funcError) throw funcError;
        if (data) {
          setEvents(data);
        }
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Could not load upcoming events.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="h-[400px] md:h-[500px] bg-slate-800 flex items-center justify-center text-white/70 rounded-lg shadow-xl mb-8 md:mb-12">
        Loading Events Banner...
      </div>
    );
  }

  if (error) {
    // You might want a more subtle error display for a banner
    console.error("EventsBanner Error:", error);
    return null; 
  }

  if (events.length === 0) {
    return null; // Don't render the banner if there are no events
  }

  return (
    <div className="relative w-full h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] mb-8 md:mb-12 group">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        spaceBetween={0} // No space between slides for full-width effect
        slidesPerView={1} // Show one slide at a time
        loop={events.length > 1} // Loop if more than one event
        autoplay={{
          delay: 5000, // Autoplay every 5 seconds
          disableOnInteraction: false,
        }}
        effect="fade" // Use 'fade' effect, or 'slide', 'coverflow', 'cube' etc.
        fadeEffect={{
            crossFade: true
        }}
        pagination={{ 
            clickable: true,
            dynamicBullets: true,
        }}
        navigation={{
            prevEl: navigationPrevRef.current,
            nextEl: navigationNextRef.current,
        }}
        onBeforeInit={(swiper) => { // Initialize navigation refs
            swiper.params.navigation.prevEl = navigationPrevRef.current;
            swiper.params.navigation.nextEl = navigationNextRef.current;
        }}
        className="h-full w-full rounded-lg shadow-xl"
      >
        {events.map((event) => (
          <SwiperSlide key={event.id} className="relative">
            <a
              href={event.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-full"
            >
              <img 
                src={event.image_url || `https://placehold.co/1200x500/34495e/ffffff?text=${encodeURIComponent(event.event_name)}&font=roboto`} 
                alt={`Banner for ${event.event_name}`} 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/1200x500/7f8c8d/ffffff?text=Event+Image+Error&font=roboto`; }}
              />
              {/* Overlay for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white w-full md:w-3/4 lg:w-2/3">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 leading-tight shadow-text">
                  {event.event_name}
                </h2>
                {event.event_description && (
                  <p className="text-sm sm:text-base md:text-lg text-slate-200 mb-3 md:mb-4 leading-relaxed hidden sm:block shadow-text">
                    {event.event_description}
                  </p>
                )}
                {event.event_date_start && (
                  <div className="flex items-center text-xs sm:text-sm text-slate-300 mb-4 shadow-text">
                    <CalendarDays size={16} className="mr-2" />
                    <span>
                      {new Date(event.event_date_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      {event.event_date_end && event.event_date_end !== event.event_date_start ? ` - ${new Date(event.event_date_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : ''}
                      {`, ${new Date(event.event_date_start).getFullYear()}`}
                    </span>
                  </div>
                )}
                <div 
                  className="inline-flex items-center px-4 py-2 md:px-6 md:py-3 bg-accent-teal text-white text-sm md:text-base font-semibold rounded-md shadow-lg hover:bg-opacity-90 transition-colors duration-300"
                >
                  Learn More <ExternalLink size={18} className="ml-2" />
                </div>
              </div>
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom Navigation Buttons - visible on group hover of the main div */}
      {events.length > 1 && (
        <>
          <button 
            ref={navigationPrevRef} 
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-teal"
            aria-label="Previous event"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            ref={navigationNextRef} 
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-teal"
            aria-label="Next event"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
};

export default EventsBanner;

