// supabase/functions/get-onboarding-interests/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts"; // Create this file or define headers directly

// Ensure you have a _shared/cors.ts or define corsHeaders here:
// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*', // Adjust for your frontend URL in production
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// };

serve(async (_req: Request) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use the anon key here, as this function might be called by unauthenticated users
    // during the onboarding flow, or by authenticated users if onboarding is post-login.
    // RLS on the table will handle actual data access.
    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("ANON_KEY")!
    );

    const { data, error } = await supabaseClient
      .from("onboarding_suggested_interests")
      .select("interest_text")
      // .order("rank", { ascending: true }) // if you implement a rank column
      .order("last_updated", { ascending: false }) // Or order by recency
      .limit(15); // Fetch a limited number of suggestions

    if (error) {
      console.error("get-onboarding-interests: Supabase query error", error);
      throw error;
    }

    const interests = data ? data.map(item => item.interest_text) : [];

    return new Response(JSON.stringify(interests), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("get-onboarding-interests: Critical error", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch onboarding interests." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});