// supabase/functions/calculate-ai-pulse-trends/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Edge Function 'calculate-ai-pulse-trends' (v5 - DB-driven config) is initializing.");

// Interface for the data fetched from processed_articles
interface ProcessedArticleData {
  tags: string[] | null; // Using LLM-generated category tags
}

serve(async (_req: Request) => {
  try {
    const supabaseAdmin: SupabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("SERVICE_KEY")!
    );

    console.log("Calculating AI Pulse trends and onboarding suggestions...");

    // --- START: Fetch configuration dynamically from DB ---
    // Instead of hardcoding, we fetch synonyms and stop tags from the database.
    console.log("Fetching dynamic configuration from database...");
    const [synonymsResult, genericTermsResult] = await Promise.all([
      supabaseAdmin.from('config_synonyms').select('synonym, canonical_term').eq('is_enabled', true),
      supabaseAdmin.from('config_generic_terms').select('term').eq('is_enabled', true)
    ]);

    if (synonymsResult.error) {
        throw new Error(`Failed to fetch synonyms: ${synonymsResult.error.message}`);
    }
    if (genericTermsResult.error) {
        throw new Error(`Failed to fetch generic terms: ${genericTermsResult.error.message}`);
    }
    
    // Create the synonym map from the fetched data
    const synonymMap = new Map<string, string>(
      synonymsResult.data.map(item => [item.synonym.toLowerCase(), item.canonical_term.toLowerCase()])
    );
    
    // Create the set of generic stop tags from the fetched data
    const genericStopTags = new Set<string>(
      genericTermsResult.data.map(item => item.term.toLowerCase())
    );

    console.log(`Loaded ${synonymMap.size} synonyms and ${genericStopTags.size} generic stop tags from DB.`);
    // --- END: Fetch configuration dynamically from DB ---


    // 1. Fetch 'tags' from recent processed_articles
    const lookbackHours = 48;
    const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

    const { data: articlesData, error: articlesError } = await supabaseAdmin
      .from("processed_articles")
      .select("tags")
      .gte("created_at", sinceDate);

    if (articlesError) {
      console.error("Error fetching articles for trend calculation:", articlesError);
      return new Response(JSON.stringify({ error: articlesError.message }), { status: 500 });
    }

    const articles = articlesData as ProcessedArticleData[] | null;

    if (!articles || articles.length === 0) {
      console.log("No recent articles found to calculate trends/onboarding interests.");
      return new Response(JSON.stringify({ message: "No recent articles." }), { status: 200 });
    }

    // 2. Aggregate initial counts for each tag
    const rawTagCounts: Record<string, number> = {};
    articles.forEach((article: ProcessedArticleData) => {
      if (article.tags && Array.isArray(article.tags)) {
        article.tags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim() !== "") {
            const processedTag = tag.toLowerCase().trim();
            rawTagCounts[processedTag] = (rawTagCounts[processedTag] || 0) + 1;
          }
        });
      }
    });
    
    // 3. Consolidate synonyms using the dynamically fetched map
    const consolidatedCounts: Record<string, number> = {};
    for (const tag in rawTagCounts) {
      const count = rawTagCounts[tag];
      const canonicalTag = synonymMap.get(tag) || tag;
      consolidatedCounts[canonicalTag] = (consolidatedCounts[canonicalTag] || 0) + count;
    }
    console.log("Synonym counts consolidated successfully.");

    // 4. Filter out generic/common terms using the dynamically fetched set
    const specificTagCounts: Record<string, number> = {};
    for (const tag in consolidatedCounts) {
      if (!genericStopTags.has(tag)) {
        specificTagCounts[tag] = consolidatedCounts[tag];
      } else {
        console.log(`Filtered out generic tag: "${tag}" with consolidated count ${consolidatedCounts[tag]}`);
      }
    }
    
    if (Object.keys(specificTagCounts).length === 0) {
        console.log("No specific tags remaining after filtering generic terms.");
        return new Response(JSON.stringify({ message: "No specific tags to process after filtering." }), { status: 200 });
    }

    // 5. Determine top N/M from the specific, consolidated, and canonical tags
    const sortedTags = Object.entries(specificTagCounts)
      .sort(([, countA], [, countB]) => countB - countA);

    // --- Populate onboarding_suggested_interests ---
    const topMOnboarding = 15;
    const onboardingSuggestions = sortedTags
        .slice(0, topMOnboarding)
        .map(([tagText, _count], index) => ({
            interest_text: tagText,
            rank: index + 1,
        }));

    if (onboardingSuggestions.length > 0) {
        console.log(`Attempting to update onboarding_suggested_interests with ${onboardingSuggestions.length} terms.`);
        const { error: deleteError } = await supabaseAdmin
            .from('onboarding_suggested_interests')
            .delete()
            .gt('id', -1);

        if (deleteError) {
            console.error('Error deleting old onboarding_suggested_interests:', deleteError.message);
        } else {
            const { data: insertedData, error: insertError } = await supabaseAdmin
                .from('onboarding_suggested_interests')
                .insert(onboardingSuggestions)
                .select();
            if (insertError) {
                console.error('Error inserting new onboarding_suggested_interests:', insertError.message);
            } else {
                console.log(`Successfully updated onboarding_suggested_interests with ${insertedData?.length || 0} terms.`);
            }
        }
    } else {
        console.log("No terms available after processing to populate onboarding_suggested_interests.");
    }

    // --- Populate trending_topics ---
    const topNTrending = 10;
    const trendingTopicsToUpsert = sortedTags
      .slice(0, topNTrending)
      .map(([tagText, count]) => {
        const maxCount = sortedTags?.[0]?.[1] || 1;
        let normalizedScore = (count / maxCount) * 0.8 + 0.2;
        normalizedScore = Math.min(1.0, Math.max(0.1, normalizedScore));

        return {
          topic_text: tagText,
          buzz_score: parseFloat(normalizedScore.toFixed(2)),
          last_updated_at: new Date().toISOString(),
          source_count: count
        };
      });

    if (trendingTopicsToUpsert.length > 0) {
      console.log("Upserting trending topics (from DB-driven config):", trendingTopicsToUpsert.map(t=>t.topic_text));
      const { error: upsertError } = await supabaseAdmin
        .from("trending_topics")
        .upsert(trendingTopicsToUpsert, { onConflict: 'topic_text' });

      if (upsertError) {
        console.error("Error upserting trending topics:", upsertError);
      } else {
        console.log(`${trendingTopicsToUpsert.length} trending topics updated.`);
      }
    } else {
      console.log("No trending topics to update after processing.");
    }

    let finalMessage = "AI Pulse trends calculation finished using dynamic DB configuration.";
    return new Response(JSON.stringify({ message: finalMessage }), { status: 200 });

  } catch (e) {
    console.error("Critical error in calculate-ai-pulse-trends function:", e.message, e.stack);
    return new Response(JSON.stringify({ error: `Internal server error: ${e.message}` }), { status: 500 });
  }
});