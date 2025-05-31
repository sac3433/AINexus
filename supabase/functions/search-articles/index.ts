// supabase/functions/search-articles/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Define the structure of the articles you expect to return
interface SearchedArticle {
  id: string;
  title: string | null;
  source_name: string | null;
  publication_date: string | null;
  summary_simple: string | null; // Or whichever summary you want to show in search results
  tags: string[] | null;
  original_url: string | null;
  // Add other relevant fields
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("ANON_KEY")!
    );

    const url = new URL(req.url);
    const query = url.searchParams.get("q");

    if (!query || query.trim() === "") {
      return new Response(JSON.stringify({ error: "Search query is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare the search query for full-text search
    // 'websearch_to_tsquery' is often better for user-entered search terms
    // It handles phrases and operators like OR, AND, NOT.
    // Example: 'artificial intelligence | machine learning'
    const ftsQuery = query.trim().split(/\s+/).join(' & '); // Basic 'AND' between terms

    // Alternative using websearch_to_tsquery for more natural language queries
    // const { data: articles, error } = await supabaseClient
    //   .from("processed_articles")
    //   .select("id, title, source_name, publication_date, summary_simple, tags, original_url")
    //   .textSearch("fts", query, { // 'fts' is your tsvector column
    //     type: 'websearch', // Use 'websearch' for more flexible query parsing
    //     config: 'english'
    //   })
    //   .limit(20);

    // Using plainto_tsquery or to_tsquery for more control:
    // plainto_tsquery treats the input as a simple string of words to match
    // to_tsquery allows operators like & (AND), | (OR), ! (NOT)
    const { data: articles, error } = await supabaseClient
      .from("processed_articles")
      .select("id, title, source_name, publication_date, summary_simple, tags, original_url") // Select fields needed for search results
      .textSearch("fts", `'${ftsQuery}'`, { // 'fts' is your tsvector column
        type: 'plain', // or 'phrase' or 'websearch'
        config: 'english'
      })
      .order('initial_article_score', { ascending: false }) // Optionally order by score
      .limit(20); // Limit results

    if (error) {
      console.error("search-articles: Supabase query error", error);
      throw error;
    }

    const searchResults: SearchedArticle[] = articles || [];

    return new Response(JSON.stringify(searchResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("search-articles: Critical error", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to search articles." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
