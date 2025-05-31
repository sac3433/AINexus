// supabase/functions/create-profile-on-signup/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Edge Function 'create-profile-on-signup' is initializing.");

// Define the structure of the user record expected from the Auth Hook
interface UserRecord {
  id: string;
  email?: string;
  // Add any other relevant fields from auth.users you might need
}

// Define the structure of the payload from the Auth Hook
interface AuthHookPayload {
  type: string;
  table: string;
  schema: string;
  record: UserRecord | null; // User object for INSERT/UPDATE, null for DELETE
  old_record: UserRecord | null; // User object for UPDATE/DELETE, null for INSERT
}

serve(async (req: Request) => {
  try {
    // 1. Validate the request (Optional but good practice: check for a secret header if you set one in the hook)
    // For Auth Hooks, Supabase internally handles secure invocation.

    // 2. Create a Supabase client with SERVICE_ROLE_KEY for admin privileges
    const supabaseAdmin: SupabaseClient = createClient(
      Deno.env.get("PROJECT_URL")!,
      Deno.env.get("SERVICE_KEY")!
    );

    // 3. Parse the incoming request body (payload from the Auth Hook)
    const payload: AuthHookPayload = await req.json();
    const user = payload.record; // The newly created user object from auth.users

    console.log(`Received Auth Hook type: ${payload.type} for user: ${user?.id}`);

    // 4. Ensure it's a user creation event and user data is present
    if (payload.type === "INSERT" && user && user.id) { // Supabase Auth Hooks for user creation use INSERT
      const profileData = {
        id: user.id, // Link to the auth.users table using the same ID
        email: user.email, // Optional: store email in profiles table for convenience
        user_type: null, // User will select this during onboarding via the frontend.
                         // Ensure your 'profiles' table allows NULL for 'user_type' or set a default ENUM value.
        ai_interests: [], // Default to an empty array
        content_preferences: {}, // Default to an empty object
        username: `user_${user.id.substring(0, 8)}_${Math.random().toString(36).substring(2, 7)}`, // Auto-generated placeholder
        updated_at: new Date().toISOString(), // Explicitly set for creation if not relying on DB default
      };

      console.log(`Attempting to insert profile for user ID: ${user.id}`, profileData);

      // 5. Insert the new profile into the 'profiles' table
      const { error } = await supabaseAdmin
        .from("profiles")
        .insert(profileData);

      if (error) {
        console.error("Error inserting profile:", error.message, error.details, error.hint);
        return new Response(
          JSON.stringify({ error: `Failed to create profile: ${error.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`Profile created successfully for user ID: ${user.id}`);
      return new Response(
        JSON.stringify({ message: "Profile created successfully", userId: user.id }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } else {
      console.warn("Payload was not an INSERT event or user data was missing.", payload);
      return new Response(
        JSON.stringify({ error: "Invalid payload or not a user creation event" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("Critical error in Edge Function:", e.message, e.stack);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${e.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});