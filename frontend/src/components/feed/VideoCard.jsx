// src/components/feed/VideoCard.jsx
import React from 'react';
import { PlayCircle, Youtube } from 'lucide-react';

const VideoCard = ({ video }) => {
  if (!video) return null;

  // Use the thumbnail URL from your database, with a fallback
  const thumbnailUrl = video.thumbnail_url || `https://placehold.co/400x225/1a202c/ffffff?text=${encodeURIComponent(video.channel_name || 'Video')}&font=roboto`;
  
  return (
    <a
      href={video.video_url} // <-- FIX: Changed from video.url to video.video_url
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-64 md:w-72 bg-card-bg rounded-lg shadow-md overflow-hidden snap-start group transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg"
    >
      <div className="relative h-36 md:h-40">
        <img
          src={thumbnailUrl}
          alt={`Thumbnail for ${video.video_title}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <PlayCircle size={48} className="text-white/80" />
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-sm font-bold text-heading-text leading-snug truncate group-hover:text-accent-teal transition-colors">
          {video.video_title}
        </h4>
        <div className="flex items-center text-xs text-main-text/70 mt-1">
          <Youtube size={14} className="mr-1.5 text-red-500" />
          <span>{video.channel_name}</span>
        </div>
      </div>
    </a>
  );
};

export default VideoCard;
