// supabase/functions/get-ai-events/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts"; // Ensure this path and file exist

interface AiEvent {
  id: number;
  event_name: string;
  event_description?: string | null;
  event_date_start?: string | null;
  event_date_end?: string | null;
  image_url?: string | null;
  external_link: string;
  display_order?: number;
}

serve(async (_req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the ANON key, as this data is public
    const supabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("ANON_KEY")!
    );

    const { data, error } = await supabaseClient
      .from("ai_events")
      .select("id, event_name, event_description, event_date_start, event_date_end, image_url, external_link, display_order")
      .eq("is_active", true) // Only fetch active events
      .order("display_order", { ascending: true }) // Order by display_order
      .order("event_date_start", { ascending: false, nullsFirst: false }) // Then by start date, newest first
      .limit(10); // Limit the number of events for the banner

    if (error) {
      console.error("get-ai-events: Supabase query error", error);
      throw error;
    }

    const events: AiEvent[] = data || [];

    return new Response(JSON.stringify(events), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("get-ai-events: Critical error", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to fetch AI events." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
