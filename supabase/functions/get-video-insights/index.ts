// supabase/functions/get-video-insights/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";


console.log("get-video-insights: Function script started. CORS Headers imported:", JSON.stringify(corsHeaders));

interface FeaturedVideo {
  id: number;
  channel_name: string;
  video_title: string;
  video_url: string;
  thumbnail_url?: string | null;
}

interface VideoSection {
  channel_name: string;
  videos: FeaturedVideo[];
}

serve(async (req: Request) => { // Changed _req to req for clarity
  console.log(`get-video-insights: Received request. Method: ${req.method}, URL: ${req.url}`);

  // Explicitly log all request headers to see what the browser is sending
  const requestHeadersObj = {};
  for (const [key, value] of req.headers.entries()) {
    requestHeadersObj[key] = value;
  }
  console.log("get-video-insights: Request Headers:", JSON.stringify(requestHeadersObj));

  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    console.log("get-video-insights: Handling OPTIONS request. Responding with CORS headers.");
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle other methods (expecting GET from your frontend)
  if (req.method === "GET") {
    try {
      console.log("get-video-insights: Handling GET request.");
      const projectUrl = Deno.env.get("PROJECT_URL");
      const anonKey = Deno.env.get("ANON_KEY");

      if (!projectUrl || !anonKey) {
        console.error("get-video-insights: Missing PROJECT_URL or ANON_KEY environment variables.");
        throw new Error("Server configuration error: Missing API credentials.");
      }
      console.log("get-video-insights: Environment variables loaded.");

      const supabaseClient = createClient(projectUrl, anonKey);
      console.log("get-video-insights: Supabase client created.");

      const { data: videos, error } = await supabaseClient
        .from("featured_videos")
        .select("id, channel_name, video_title, video_url, thumbnail_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(20);

      if (error) {
        console.error("get-video-insights: Supabase query error:", error);
        throw error; // Let the catch block handle the response
      }
      console.log("get-video-insights: Supabase query successful. Videos fetched:", videos ? videos.length : 0);

      if (!videos || videos.length === 0) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const groupedByChannel = videos.reduce((acc, video) => {
        if (!acc[video.channel_name]) {
          acc[video.channel_name] = [];
        }
        acc[video.channel_name].push(video);
        return acc;
      }, {} as Record<string, FeaturedVideo[]>);

      const videoSections: VideoSection[] = Object.entries(groupedByChannel).map(
        ([channelName, videoList]) => ({
          channel_name: channelName,
          videos: videoList as FeaturedVideo[],
        })
      );
      
      console.log("get-video-insights: Successfully processed videos. Sending response.");
      return new Response(JSON.stringify(videoSections), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (err) {
      console.error("get-video-insights: Error in GET request processing:", err.message, err.stack);
      return new Response(JSON.stringify({ error: err.message || "Failed to fetch video insights." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Ensure CORS headers on error
        status: 500,
      });
    }
  } else {
    // Handle other methods not allowed
    console.warn(`get-video-insights: Method ${req.method} not allowed.`);
    return new Response(JSON.stringify({ error: `Method ${req.method} not allowed.` }), {
      headers: { ...corsHeaders, "Allow": "GET, OPTIONS", "Content-Type": "application/json" },
      status: 405,
    });
  }
});
