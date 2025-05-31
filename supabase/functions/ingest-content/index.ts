// supabase/functions/ingest-content/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseFeed } from "https://deno.land/x/rss@0.6.0/mod.ts"; // RSS Parser

console.log("Edge Function 'ingest-content' (Enhanced v1 - Review) is initializing.");

interface Source {
  id: string;
  name: string;
  url: string;
  type: 'API' | 'RSS' | 'SCRAPE';
  last_fetched_at: string | null;
  specific_config: any; // Consider defining more specific types if possible
}

serve(async (_req: Request) => {
  try {
    const supabaseAdmin: SupabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("SERVICE_KEY")!
    );

    console.log("Fetching enabled sources...");
    const { data: sources, error: sourcesError } = await supabaseAdmin
     .from("sources")
     .select("*")
     .eq("is_enabled", true);

    if (sourcesError) {
      console.error("Error fetching sources:", sourcesError);
      return new Response(JSON.stringify({ error: `Error fetching sources: ${sourcesError.message}` }), { status: 500 });
    }

    if (!sources || sources.length === 0) {
      console.log("No enabled sources found.");
      return new Response(JSON.stringify({ message: "No enabled sources to process." }), { status: 200 });
    }

    let articlesIngestedCount = 0;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3); // Filter for recent articles

    for (const source of sources as Source[]) {
      console.log(`Processing source: ${source.name} (${source.url})`);
      try {
        if (source.type === 'RSS') {
          const response = await fetch(source.url);
          if (!response.ok) {
            console.error(`Failed to fetch RSS feed for ${source.name}: ${response.status}`);
            continue;
          }
          const xml = await response.text();
          const feed = await parseFeed(xml); // Make sure this parser handles errors gracefully

          if (feed.entries) {
            for (const entry of feed.entries) {
              const articleUrl = entry.links?.[0]?.href || entry.id; // entry.id can be a GUID, ensure it's a URL
              if (!articleUrl || (!articleUrl.startsWith('http://') && !articleUrl.startsWith('https://'))) {
                console.warn("Skipping entry with invalid or missing URL:", entry.title?.value, "URL:", articleUrl);
                continue;
              }

              const publicationDateEntry = entry.published || entry.updated;
              if (!publicationDateEntry) {
                console.warn(`Skipping entry with no publication date: ${entry.title?.value}`);
                continue;
              }
              
              const publicationDate = new Date(publicationDateEntry);
              if (isNaN(publicationDate.getTime())) {
                  console.warn(`Skipping entry with invalid publication date '${publicationDateEntry}': ${entry.title?.value}`);
                  continue;
              }

              // Filter: Only ingest articles from the last 3 months
              if (publicationDate < threeMonthsAgo) {
                // console.log(`Skipping old article (older than 3 months): ${entry.title?.value} (${publicationDate.toISOString()})`);
                continue;
              }

              const { data: existingArticle, error: checkError } = await supabaseAdmin
               .from("raw_articles")
               .select("id")
               .eq("source_url", articleUrl)
               .maybeSingle();

              if (checkError) {
                console.error(`Error checking for duplicate article ${articleUrl}:`, checkError);
                continue;
              }

              if (!existingArticle) {
                const { error: insertError } = await supabaseAdmin
                 .from("raw_articles")
                 .insert({
                    source_id: source.id,
                    source_url: articleUrl,
                    title_raw: entry.title?.value || null, // Handle missing titles
                    raw_content_text: entry.description?.value || entry.content?.value || '', // Ensure some content
                    publication_date_raw: publicationDate.toISOString(), // Store as ISO string
                    status: 'pending_processing'
                  });

                if (insertError) {
                  console.error(`Error inserting article ${articleUrl}:`, insertError);
                } else {
                  articlesIngestedCount++;
                  console.log(`Ingested (recent): ${entry.title?.value || 'Untitled Article'}`);
                }
              }
            }
          }
        } else if (source.type === 'API') {
          console.warn(`API fetching for ${source.name} not yet implemented with date filtering.`);
          // TODO: Implement API fetching logic with date filtering if the API supports it
        } else if (source.type === 'SCRAPE') {
          console.warn(`Scraping for ${source.name} not yet implemented with date filtering.`);
          // TODO: Implement scraping logic. Date filtering during scraping can be complex.
        }

        await supabaseAdmin
         .from("sources")
         .update({ last_fetched_at: new Date().toISOString() })
         .eq("id", source.id);

      } catch (sourceProcessError) {
        console.error(`Error processing source ${source.name}:`, sourceProcessError.message, sourceProcessError.stack);
        // Optionally, update source status or log this error to a separate table for monitoring
      }
    }
    console.log(`Ingestion complete. Total new recent articles ingested: ${articlesIngestedCount}`);
    return new Response(JSON.stringify({ message: "Ingestion process finished.", ingested_count: articlesIngestedCount }), { status: 200 });

  } catch (e) {
    console.error("Critical error in ingest-content function:", e.message, e.stack);
    return new Response(JSON.stringify({ error: `Internal server error: ${e.message}` }), { status: 500 });
  }
});