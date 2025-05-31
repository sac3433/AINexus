// supabase/functions/get-ai-pulse/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts"; // Ensure this path is correct

interface TrendingTopic {
  topic_text: string;
  buzz_score: number;
  last_updated_at: string;
  source_count: number;
}

serve(async (_req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("ANON_KEY")! // Use ANON_KEY as this data is public
    );

    const { data, error } = await supabaseClient
      .from("trending_topics")
      .select("topic_text, buzz_score, last_updated_at, source_count")
      .order("buzz_score", { ascending: false }) // Show highest buzz first
      .order("last_updated_at", { ascending: false }) // Then by most recently updated
      .limit(10); // Fetch top 10 trending topics

    if (error) {
      console.error("get-ai-pulse: Supabase query error", error);
      throw error;
    }

    const trendingTopics: TrendingTopic[] = data || [];

    return new Response(JSON.stringify(trendingTopics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("get-ai-pulse: Critical error", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch AI pulse." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
