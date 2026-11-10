import { google } from "@ai-sdk/google";

// Vercel AI Gateway required a paid top-up even for the free tier, so we
// switched to calling Google AI Studio (Gemini) directly instead. All AI
// calls (Task 7, 9) should import this rather than hardcoding a model.
// Requires GOOGLE_GENERATIVE_AI_API_KEY in .env.local.
// gemini-3.7-flash hit its free-tier daily quota (20 req/day) during testing.
// gemini-flash-lite-latest has a separate, higher quota bucket.
export const MODEL_ID = google("gemini-flash-lite-latest");
