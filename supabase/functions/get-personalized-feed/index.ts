// supabase/functions/get-personalized-feed/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts"; // Assuming you have CORS headers

interface UserProfile {
  id: string;
  user_type: string | null;
  ai_interests: string[] | null;
  content_preferences: {
    summary_style?: string; // e.g., 'executive', 'technical', 'simple', 'brief', 'detailed'
    show_technical_details?: boolean;
    // Add other preference fields here if needed
  } | null;
}

interface ProcessedArticle {
  id: string;
  title: string | null;
  source_name: string | null;
  publication_date: string | null;
  summary_executive: string | null;
  summary_technical: string | null;
  summary_simple: string | null;
  tags: string[] | null; // LLM-generated tags
  keywords_for_pulse: string[] | null;
  initial_article_score: number | null;
  original_url: string | null;
  // Add any other fields needed by the frontend news card
  [key: string]: any; // Allow other properties
}

interface PersonalizedArticle extends ProcessedArticle {
  display_summary: string | null; // The summary selected for this user
  personalized_score_debug?: Record<string, number>; // Optional: for debugging scores
}

// Lemmatizer (if needed for matching user interests to tags/keywords)
// Assuming the lemmatizer setup from process-article is available or can be imported/replicated
// For simplicity here, we'll assume direct or lowercased matching for interests.
// If lemmatization is needed for matching interests to tags, import and initialize it.
// import winkActualModule from "npm:wink-lemmatizer";
// let lemmatize: (text: string) => string;
// ... (lemmatizer initialization logic from process-article) ...


async function calculatePersonalizedScore(
  article: ProcessedArticle,
  userProfile: UserProfile
): Promise<number> {
  let score = article.initial_article_score || 0.0;
  const debugScores: Record<string, number> = { base: score };

  // 1. AI Interest Matching Boost
  if (userProfile.ai_interests && userProfile.ai_interests.length > 0 && article.tags && article.tags.length > 0) {
    const userInterestsLower = userProfile.ai_interests.map(interest => interest.toLowerCase());
    const articleTagsLower = article.tags.map(tag => tag.toLowerCase());
    // const articleKeywordsPulseLower = (article.keywords_for_pulse || []).map(kw => kw.toLowerCase());

    let interestMatchCount = 0;
    for (const userInterest of userInterestsLower) {
      if (articleTagsLower.includes(userInterest)) { // Simple exact match on lowercased tags
        interestMatchCount++;
      }
      // Optionally, also check against lemmatized keywords_for_pulse if lemmatizer is setup here
      // For example: if (articleKeywordsPulseLower.map(k => lemmatize(k)).includes(lemmatize(userInterest))) interestMatchCount++;
    }

    if (interestMatchCount > 0) {
      const interestBoost = interestMatchCount * 0.1; // Example: 0.1 boost per matched interest
      score += interestBoost;
      debugScores.interestBoost = interestBoost;
    }
  }

  // 2. User Type Affinity Boost (Example - can be more sophisticated)
  // This is highly dependent on how you define affinity.
  // For example, if certain tags are known to be highly relevant for a user type.
  if (userProfile.user_type === 'technical' && article.summary_technical && article.summary_technical.length > 50) {
      const technicalBoost = 0.05; // Small boost if a technical summary exists and user is technical
      score += technicalBoost;
      debugScores.technicalBoost = technicalBoost;
  }
  if (userProfile.user_type === 'executive' && article.summary_executive && article.summary_executive.length > 50) {
      const executiveBoost = 0.05;
      score += executiveBoost;
      debugScores.executiveBoost = executiveBoost;
  }

  // Add more boosting/penalizing factors as needed
  // e.g., based on source preferences (if you implement source liking/disliking)
  // e.g., if content_preferences.show_technical_details is true and article has technical summary

  // Store debug scores if you want to send them to frontend or log
  // (article as PersonalizedArticle).personalized_score_debug = debugScores;
  
  return Math.min(1.0, Math.max(0.0, score)); // Clamp score between 0 and 1
}


serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const supabaseAnonKey = Deno.env.get("ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase project URL or anon key.");
    }
    
    // Create a new Supabase client with the Auth context of the user making the request
    // This requires the user's JWT to be passed in the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        console.warn("get-personalized-feed: Missing Authorization header.");
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    });

    // 1. Get the currently authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("get-personalized-feed: Error fetching user or no user found.", userError);
      return new Response(JSON.stringify({ error: "User not authenticated or error fetching user." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch the user's profile
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type, ai_interests, content_preferences")
      .eq("id", user.id)
      .single<UserProfile>();

    if (profileError || !userProfile) {
      console.error(`get-personalized-feed: Error fetching profile for user ${user.id}`, profileError);
      // Proceed with default/no personalization or return error. For now, proceed with defaults.
      // Consider if this should be a hard error or if a generic feed is okay.
      // return new Response(JSON.stringify({ error: "Failed to fetch user profile." }), {
      //   status: 500,
      //   headers: { ...corsHeaders, "Content-Type": "application/json" },
      // });
      // For now, let's assume a default profile if fetch fails, to still return some articles
      const defaultProfile: UserProfile = { 
          id: user.id, 
          user_type: null, 
          ai_interests: [], 
          content_preferences: { summary_style: 'simple' } 
      };
      console.warn(`get-personalized-feed: Using default profile for user ${user.id} due to profile fetch issue.`);
      Object.assign(userProfile || {}, defaultProfile); // Use defaultProfile if userProfile is null/undefined
    }
    
    console.log(`get-personalized-feed: User ${user.id}, Type: ${userProfile?.user_type}, Interests: ${userProfile?.ai_interests?.join(',')}`);

    // 3. Fetch recent processed articles (e.g., last 50, ordered by publication date or initial score)
    // Add other necessary fields for display: original_url, etc.
    const { data: articles, error: articlesError } = await supabase
      .from("processed_articles")
      .select("id, title, source_name, publication_date, summary_executive, summary_technical, summary_simple, tags, keywords_for_pulse, initial_article_score, original_url")
      .order("publication_date", { ascending: false }) // Or initial_article_score
      .limit(50) // Adjust limit as needed
      .returns<ProcessedArticle[]>();

    if (articlesError) {
      console.error("get-personalized-feed: Error fetching processed articles.", articlesError);
      return new Response(JSON.stringify({ error: "Failed to fetch articles." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!articles || articles.length === 0) {
        console.log("get-personalized-feed: No processed articles found.");
        return new Response(JSON.stringify([]), { // Return empty array if no articles
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 4. Personalize and Rank
    const personalizedArticlesPromises = articles.map(async (article) => {
      const personalizedScore = await calculatePersonalizedScore(article, userProfile!);
      
      let displaySummary = article.summary_simple; // Default summary
      const preferredStyle = userProfile?.content_preferences?.summary_style;

      if (preferredStyle === 'executive' && article.summary_executive) {
        displaySummary = article.summary_executive;
      } else if (preferredStyle === 'technical' && article.summary_technical) {
        displaySummary = article.summary_technical;
      } else if (preferredStyle === 'simple' && article.summary_simple) {
        displaySummary = article.summary_simple;
      } else if (preferredStyle === 'brief' && article.summary_executive) { // Assuming executive is briefest after simple
        displaySummary = article.summary_executive; 
      } else if (preferredStyle === 'detailed' && article.summary_technical) { // Assuming technical is most detailed
        displaySummary = article.summary_technical;
      }
      // Fallback to executive or simple if preferred doesn't exist but others do
      else if (!displaySummary && article.summary_executive) displaySummary = article.summary_executive;
      else if (!displaySummary && article.summary_simple) displaySummary = article.summary_simple;


      return {
        ...article,
        display_summary: displaySummary || "Summary not available.",
        final_personalized_score: personalizedScore, // Add this for sorting
      } as PersonalizedArticle; // Cast to include display_summary and personalized_score
    });

    let resolvedPersonalizedArticles = await Promise.all(personalizedArticlesPromises);

    // Sort by the new final_personalized_score (descending)
    resolvedPersonalizedArticles.sort((a, b) => (b.final_personalized_score || 0) - (a.final_personalized_score || 0));
    
    // Limit the number of articles sent to the frontend after personalization
    const feedLimit = 20; // Example limit
    resolvedPersonalizedArticles = resolvedPersonalizedArticles.slice(0, feedLimit);

    console.log(`get-personalized-feed: Returning ${resolvedPersonalizedArticles.length} personalized articles for user ${user.id}.`);

    return new Response(JSON.stringify(resolvedPersonalizedArticles), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("get-personalized-feed: Critical error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});