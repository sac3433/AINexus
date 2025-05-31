// src/components/feed/NewsFeed.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ArticleCard from './ArticleCard'; // Import the card component

// Skeleton loader component for a more polished loading state
const ArticleCardSkeleton = () => (
  <div className="bg-card-bg p-4 rounded-lg shadow-md animate-pulse">
    <div className="h-48 bg-slate-300 rounded mb-4"></div>
    <div className="h-4 bg-slate-300 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-slate-300 rounded w-1/2 mb-3"></div>
    <div className="h-3 bg-slate-300 rounded w-full mb-1"></div>
    <div className="h-3 bg-slate-300 rounded w-full mb-1"></div>
    <div className="h-3 bg-slate-300 rounded w-5/6"></div>
  </div>
);

const NewsFeed = () => {
  const { user, profile } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch feed if the user is logged in
    if (!user) {
      setLoading(false);
      setArticles([]);
      return;
    }

    const fetchFeed = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: funcError } = await supabase.functions.invoke('get-personalized-feed');
        
        if (funcError) {
          // The error from invoke has a nested structure sometimes
          const errorMessage = funcError.context?.msg || funcError.message || "An unknown error occurred.";
          throw new Error(errorMessage);
        }

        if (data) {
          setArticles(data);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error("Error fetching personalized feed:", err);
        setError(`Could not load your feed. ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeed();
  }, [user]); // Refetch when the user logs in or out

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(n => <ArticleCardSkeleton key={n} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-card-bg p-6 rounded-lg shadow-md text-center">
        <p className="text-main-text text-lg">
          Your personalized feed is currently empty.
        </p>
        <p className="text-sm text-main-text/70 mt-2">
          As new AI insights are processed, they will appear here based on your preferences.
        </p>
        {profile && (!profile.user_type || !profile.ai_interests) && (
            <p className="text-sm text-accent-teal mt-4 font-semibold">
                Tip: Complete your profile preferences to get a better feed!
            </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
};

export default NewsFeed;
