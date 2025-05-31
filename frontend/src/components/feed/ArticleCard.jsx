// src/components/feed/ArticleCard.jsx
import React from 'react';
import { ExternalLink, Tag, Calendar, Building } from 'lucide-react';

// Helper to format the date
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return dateString; // Return original string if date is invalid
  }
};

const ArticleCard = ({ article }) => {
  if (!article) return null;

  // Placeholder for article image. In the future, you could add an 'image_url'
  // field to your 'processed_articles' table and use it here.
  const imageUrl = `https://placehold.co/600x400/5e6d80/ffffff?text=${encodeURIComponent(article.title || 'AI Nexus')}&font=roboto`;
  
  return (
    <a
      href={article.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col bg-card-bg rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 ease-in-out overflow-hidden group"
    >
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={`Visual representation of ${article.title}`}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
        />
        <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ExternalLink size={16} className="text-white/80" />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Source and Date */}
        <div className="flex items-center text-xs text-main-text/70 mb-2 space-x-3">
          <div className="flex items-center">
            <Building size={12} className="mr-1.5" />
            <span>{article.source_name || 'Unknown Source'}</span>
          </div>
          <div className="flex items-center">
            <Calendar size={12} className="mr-1.5" />
            <span>{formatDate(article.publication_date)}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-heading-text leading-tight mb-2 group-hover:text-accent-teal transition-colors duration-200">
          {article.title}
        </h3>

        {/* Display Summary */}
        <p className="text-sm text-main-text flex-grow mb-4 leading-relaxed">
          {article.display_summary}
        </p>

        {/* Tags Section */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-slate-200/50">
            {article.tags.slice(0, 3).map((tag, index) => ( // Show up to 3 tags
              <span key={index} className="flex items-center text-xs bg-accent-teal/10 text-accent-teal font-medium px-2 py-1 rounded-full">
                <Tag size={12} className="mr-1.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
};

export default ArticleCard;

