// supabase/functions/process-article/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import winkActualModule from "npm:wink-lemmatizer";

console.log("Edge Function 'process-article' (Enhanced v3 - LLM Direct Scoring/Tagging) is initializing.");

let lemmatize: (text: string) => string;

if (
    winkActualModule &&
    typeof winkActualModule.noun === 'function' &&
    typeof winkActualModule.verb === 'function' &&
    typeof winkActualModule.adjective === 'function'
) {
    console.log("Successfully found POS-specific lemmatizers (noun, verb, adjective) from wink-lemmatizer module.");
    lemmatize = function(word: string): string {
        const lowerWord = word.toLowerCase();
        let lemma = winkActualModule.noun(lowerWord);
        if (lemma !== lowerWord) return lemma;
        lemma = winkActualModule.verb(lowerWord);
        if (lemma !== lowerWord) return lemma;
        lemma = winkActualModule.adjective(lowerWord);
        return lemma;
    };
    console.log("Custom generic lemmatize function initialized successfully.");
} else {
    console.error("CRITICAL: Could not find required POS-specific functions (noun, verb, adjective) on the imported wink-lemmatizer module.");
    // Further logging as before...
    throw new Error("Lemmatization service could not be initialized due to missing POS-specific functions.");
}

interface RawArticle {
  id: string;
  source_url: string;
  title_raw: string | null;
  raw_content_text: string | null;
  publication_date_raw: string | null;
  source_id: string;
}

interface SourceData {
  name: string;
  source_credibility_score: number | null;
}

// AiKeyword interface is removed as calculateKeywordRelevanceScore and generateTags are removed.

interface TrendingTopic {
  topic_text: string;
  buzz_score: number;
}

interface GeminiAiInsights {
  executive_summary: string;
  technical_summary: string;
  simple_summary: string;
  extracted_keywords: string[];
  ai_relevance_score: number; // New field for LLM-provided relevance score
  generated_tags: string[];   // New field for LLM-provided tags
}

async function getAiInsightsFromGemini(
  textToAnalyze: string,
  geminiApiKey: string,
  model = "gemini-1.5-flash-latest"
): Promise<GeminiAiInsights> {
  const defaultInsights: GeminiAiInsights = {
    executive_summary: "Content was empty or too short for analysis.",
    technical_summary: "Content was empty or too short for analysis.",
    simple_summary: "Content was empty or too short for analysis.",
    extracted_keywords: [],
    ai_relevance_score: 0.0,
    generated_tags: [],
  };

  if (!textToAnalyze || textToAnalyze.trim().length < 50) { // Added minimum length check
    console.warn("Text to analyze is too short, returning default insights.");
    return defaultInsights;
  }

  const maxInputChars = 15000;
  const truncatedText = textToAnalyze.length > maxInputChars
    ? textToAnalyze.substring(0, maxInputChars)
    : textToAnalyze;

  const prompt = `
You are an AI assistant tasked with analyzing articles. For the following text:

1.  Generate a concise executive summary (target 2-3 sentences, max 75 words) focusing on strategic implications and key takeaways for a business leader.
2.  Generate a brief technical abstract (target 2-3 sentences, max 75 words) highlighting key methods, technologies, or findings for a technical audience.
3.  Explain this in simple terms (target 2-3 sentences, max 75 words) for a non-technical person, focusing on what it is and why it matters.
4.  Extract a list of 5 to 7 key AI-specific named entities, concepts, or technical terms that are central to this article. These should be suitable for use as keywords.
5.  On a scale of 0.0 to 1.0, how relevant and important is this article to a professional interested in strategic AI developments, new AI technologies, product launches, or significant AI research advancements? Provide only the score as a float (e.g., 0.7).
6.  Generate a list of 3 to 5 relevant category tags for this article (e.g., "Machine Learning", "AI Ethics", "Cloud Computing", "NLP", "Generative AI"). The tags should be broad enough for categorization.

Please provide the output in a valid JSON format with the following keys: "executive_summary", "technical_summary", "simple_summary", "extracted_keywords", "ai_relevance_score", "generated_tags".
The "extracted_keywords" and "generated_tags" should be an array of strings. The "ai_relevance_score" should be a number.

Text to analyze:
"""
${truncatedText}
"""
`;

  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1000, // Increased slightly for new fields
          response_mime_type: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gemini API Error:`, response.status, errorBody);
      let errorMessage = `Insights generation failed (Gemini API Error: ${response.status})`;
      // Return default insights with error message in summaries
      return {
        ...defaultInsights,
        executive_summary: errorMessage,
        technical_summary: errorMessage,
        simple_summary: errorMessage,
      };
    }

    const data = await response.json();
    const insightsText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (insightsText) {
      try {
        const parsedInsights = JSON.parse(insightsText);
        return {
            executive_summary: parsedInsights.executive_summary || defaultInsights.executive_summary,
            technical_summary: parsedInsights.technical_summary || defaultInsights.technical_summary,
            simple_summary: parsedInsights.simple_summary || defaultInsights.simple_summary,
            extracted_keywords: Array.isArray(parsedInsights.extracted_keywords) ? parsedInsights.extracted_keywords.slice(0, 7) : defaultInsights.extracted_keywords,
            ai_relevance_score: (typeof parsedInsights.ai_relevance_score === 'number' && parsedInsights.ai_relevance_score >= 0 && parsedInsights.ai_relevance_score <= 1) ? parsedInsights.ai_relevance_score : defaultInsights.ai_relevance_score,
            generated_tags: Array.isArray(parsedInsights.generated_tags) ? parsedInsights.generated_tags.slice(0, 5) : defaultInsights.generated_tags,
        };
      } catch (parseError) {
        console.error("Error parsing Gemini JSON response:", parseError, "Raw response:", insightsText);
        return { ...defaultInsights, executive_summary: "Failed to parse insights from Gemini." };
      }
    } else {
        console.error("Insights not available or invalid structure in Gemini API response. Full response:", JSON.stringify(data, null, 2));
        return { ...defaultInsights, executive_summary: "Insights not available from Gemini API response." };
    }
  } catch (apiError) {
    console.error(`Network or other error calling Gemini API:`, apiError.message, apiError.stack);
    return { ...defaultInsights, executive_summary: "Insights generation failed (Network or code Error)." };
  }
}

function calculateFreshnessScore(publicationDate: Date | null): number {
    if (!publicationDate || isNaN(publicationDate.getTime())) return 0.1;
    const now = new Date();
    const articleAgeDays = (now.getTime() - publicationDate.getTime()) / (1000 * 3600 * 24);
    if (articleAgeDays < 1) return 1.0;
    if (articleAgeDays <= 2) return 0.9;
    if (articleAgeDays <= 7) return 0.7;
    if (articleAgeDays <= 14) return 0.5;
    if (articleAgeDays <= 30) return 0.3;
    return 0.1;
}

// calculateKeywordRelevanceScore function is REMOVED
// generateTags function is REMOVED

serve(async (_req: Request) => {
  try {
    if (typeof lemmatize !== 'function') {
        console.error("Lemmatize function is not available at the start of serve request processing.");
        throw new Error("Lemmatization service critical failure: function not initialized.");
    }

    const supabaseAdmin: SupabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("SERVICE_KEY")!
    );
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY secret is not set for the Edge Function.");
      return new Response(JSON.stringify({ error: "Summarization service not configured." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const BATCH_SIZE = 3;
    console.log(`Fetching a batch of ${BATCH_SIZE} articles pending processing...`);

    const { data: rawArticlesData, error: fetchError } = await supabaseAdmin
    .from("raw_articles")
    .select("*, sources(name, source_credibility_score)") // Ensure you select source relation correctly if needed
    .eq("status", "pending_processing")
    .order('fetched_at', { ascending: true })
    .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("Error fetching raw articles batch:", fetchError);
      return new Response(JSON.stringify({ error: `Error fetching raw articles: ${fetchError.message}` }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const rawArticles = rawArticlesData as (RawArticle & { sources: SourceData | null })[] | null;

    if (!rawArticles || rawArticles.length === 0) {
      console.log("No articles pending processing found in this batch.");
      return new Response(JSON.stringify({ message: "No articles to process in this batch." }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    let articlesProcessedCount = 0;
    for (const rawArticle of rawArticles) {
      console.log(`--------------------------------------------------------------------`);
      console.log(`Processing article ID: ${rawArticle.id}, Title: ${rawArticle.title_raw || 'Untitled'} (${rawArticle.source_url})`);
      await supabaseAdmin.from("raw_articles").update({ status: 'processing' }).eq("id", rawArticle.id);

      try {
        const contentToAnalyze = rawArticle.raw_content_text || rawArticle.title_raw || "";
        
        const aiInsights = await getAiInsightsFromGemini(contentToAnalyze, geminiApiKey);
        console.log(`Article ID ${rawArticle.id}: Gemini Insights -> Score: ${aiInsights.ai_relevance_score}, Tags: [${aiInsights.generated_tags.join(', ')}], Keywords: [${aiInsights.extracted_keywords.join(', ')}]`);
        
        // Use LLM-provided score directly as keyword_relevance_score
        const keywordRelevanceScoreVal = aiInsights.ai_relevance_score;
        
        // Use LLM-provided tags directly
        const tagsArray = aiInsights.generated_tags;

        // keywords_for_pulse still uses lemmatized extracted_keywords from Gemini
        const keywordsForPulse = aiInsights.extracted_keywords.map(kw => lemmatize(kw.toLowerCase())).slice(0,10);
        console.log(`Article ID ${rawArticle.id}: Keywords for Pulse (lemmatized): [${keywordsForPulse.join(', ')}]`);

        const publicationDate = rawArticle.publication_date_raw ? new Date(rawArticle.publication_date_raw) : null;
        const freshnessScoreVal = calculateFreshnessScore(publicationDate);
        
        const scsVal = Number(rawArticle.sources?.source_credibility_score ?? 0.5);
        const sourceName = rawArticle.sources?.name ?? "Unknown Source";

        let aiPulseContribution = 0.0;
        const { data: trendingTopicsData, error: ttError } = await supabaseAdmin
        .from("trending_topics")
        .select("topic_text, buzz_score")
        .order("buzz_score", { ascending: false })
        .limit(10);

        if (ttError) {
          console.error(`Article ID ${rawArticle.id}: Error fetching trending topics for APS:`, ttError);
        } else if (trendingTopicsData && trendingTopicsData.length > 0) {
          const trendingTopics = trendingTopicsData as TrendingTopic[];
          const lemmatizedTrendingTopics = trendingTopics.map(tt => ({
          ...tt,
            topic_text: lemmatize(tt.topic_text.toLowerCase()) 
          }));

          for (const articleKeyword of keywordsForPulse) {
            const foundTrend = lemmatizedTrendingTopics.find(tt => tt.topic_text === articleKeyword);
            if (foundTrend) {
              aiPulseContribution += Number(foundTrend.buzz_score);
            }
          }
        }
        const aiPulseContributionScoreVal = parseFloat(Math.min(1.0, Number(aiPulseContribution) / 3.0).toFixed(1));
        
        const numScs = Number(scsVal);
        const numKrs = Number(keywordRelevanceScoreVal); // This is now the LLM score
        const numFs = Number(freshnessScoreVal);
        const numAps = Number(aiPulseContributionScoreVal);

        if (isNaN(numScs) || isNaN(numKrs) || isNaN(numFs) || isNaN(numAps)) {
            console.error(`Article ID ${rawArticle.id}: Critical Error: One of the score components is NaN before final sum.`,
                          `SCS: ${scsVal} (-> ${numScs})`,
                          `KRS: ${keywordRelevanceScoreVal} (-> ${numKrs})`, // LLM score
                          `FS: ${freshnessScoreVal} (-> ${numFs})`,
                          `APS: ${aiPulseContributionScoreVal} (-> ${numAps})`);
        }

        const rawInitialArticleScore = (numScs * 0.4) + (numKrs * 0.3) + (numFs * 0.2) + (numAps * 0.1);
        const initialArticleScore = parseFloat(rawInitialArticleScore.toFixed(2));
        console.log(`Article ID ${rawArticle.id}: Final Scores -> Initial: ${initialArticleScore}, KRS (LLM): ${numKrs}, FS: ${numFs}, APS: ${numAps}, SCS: ${numScs}`);

        const processedData = {
          raw_article_id: rawArticle.id,
          original_url: rawArticle.source_url,
          title: rawArticle.title_raw || "Untitled",
          source_name: sourceName,
          publication_date: publicationDate && !isNaN(publicationDate.getTime()) ? publicationDate.toISOString() : null,
          summary_executive: aiInsights.executive_summary,
          summary_technical: aiInsights.technical_summary,
          summary_simple: aiInsights.simple_summary,
          tags: tagsArray, // Directly from LLM
          keywords_for_pulse: keywordsForPulse,
          initial_article_score: isNaN(initialArticleScore) ? 0.0 : initialArticleScore,
          freshness_score: numFs,
          keyword_relevance_score: numKrs, // Directly from LLM
          ai_pulse_contribution_score: numAps,
          updated_at: new Date().toISOString()
        };

        const { error: insertProcessedError } = await supabaseAdmin
        .from("processed_articles")
        .insert(processedData);

        if (insertProcessedError) {
          console.error(`Article ID ${rawArticle.id}: Error inserting processed article ${rawArticle.source_url}:`, insertProcessedError.message, insertProcessedError.details, insertProcessedError.hint);
          await supabaseAdmin.from("raw_articles").update({ status: 'failed', processing_error: insertProcessedError.message }).eq("id", rawArticle.id);
        } else {
          await supabaseAdmin.from("raw_articles").update({ status: 'processed' }).eq("id", rawArticle.id);
          articlesProcessedCount++;
          console.log(`Article ID ${rawArticle.id}: Successfully processed and inserted: ${rawArticle.title_raw || 'Untitled'}`);
        }
      } catch (articleProcessError) {
        console.error(`Article ID ${rawArticle.id}: Error processing article:`, articleProcessError.message, articleProcessError.stack);
        await supabaseAdmin.from("raw_articles").update({ status: 'failed', processing_error: articleProcessError.message }).eq("id", rawArticle.id);
      }
      console.log(`--------------------------------------------------------------------`);
    }

    console.log(`Processing complete for this invocation. Total articles processed in this batch: ${articlesProcessedCount}`);
    return new Response(JSON.stringify({ message: "Batch processing finished for this invocation.", processed_count: articlesProcessedCount }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Critical error in process-article function:", e.message, e.stack);
    return new Response(JSON.stringify({ error: `Internal server error: ${e.message}` }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});