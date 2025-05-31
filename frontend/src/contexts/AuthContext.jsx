import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
      setLoading(false);
    };

    fetchSession();

    // Correctly destructure to get the subscription object
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user, event === 'SIGNED_IN' || event === 'USER_UPDATED');
        } else {
          setProfile(null);
          setShowOnboarding(false);
        }
        setLoading(false);
      }
    );

    // Cleanup function: Call unsubscribe on the subscription object
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  const fetchUserProfile = async (currentUser, isNewSignInOrUpdate = false) => {
    if (!currentUser) {
        setProfile(null); // Ensure profile is cleared if no user
        setShowOnboarding(false);
        return;
    }
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error && status !== 406) { // 406: Not acceptable (usually means 0 rows for .single())
        console.error('Error fetching profile:', error);
        setProfile(null); // Explicitly set profile to null on error
        // Potentially show onboarding if it's a new sign-in and profile fetch fails for an expected reason
        if (isNewSignInOrUpdate) {
            setShowOnboarding(true);
        }
      } else if (data) {
        setProfile(data);
        // Check if essential onboarding fields are missing to determine if onboarding is needed
        if (!data.user_type || !data.ai_interests || data.ai_interests.length === 0 || !data.content_preferences?.summary_style) {
            setShowOnboarding(true);
        } else {
            setShowOnboarding(false);
        }
      } else if (isNewSignInOrUpdate) {
        console.log("Profile not found or incomplete for user (isNewSignInOrUpdate=true), showing onboarding.");
        // This case happens if the Edge Function for profile creation is delayed
        // or if a user logs in immediately after sign-up before the profile is fully populated with user_type etc.
        setProfile(null); // Profile doesn't exist yet or is incomplete
        setShowOnboarding(true);
      } else {
        // No data and not a new sign-in/update implies no profile exists and it's not an onboarding scenario
        setProfile(null);
        setShowOnboarding(false);
      }
    } catch (err) {
      console.error('Exception in fetchUserProfile:', err);
      setProfile(null);
      // Decide if onboarding should be shown on a catch-all error,
      // for now, let's be conservative and not show it unless it's clearly a new user scenario.
    }
  };

  const updateProfileAndCompleteOnboarding = async (profileUpdates) => {
    if (!user) return false;
    try {
        const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)
        .select() // Fetch the updated row
        .single();

        if (error) {
        console.error('Error updating profile:', error);
        return false;
        }
        if (data) {
        setProfile(data); // Update local profile state with the new data
        setShowOnboarding(false); // Onboarding is now complete
        return true;
        }
    } catch (err) {
        console.error('Exception updating profile:', err);
        return false;
    }
    return false;
  };

  const value = {
    user,
    profile,
    loading,
    showOnboarding,
    signIn: (options) => supabase.auth.signInWithOAuth(options),
    signInWithPassword: (credentials) => supabase.auth.signInWithPassword(credentials),
    signUp: (credentials) => supabase.auth.signUp(credentials),
    signOut: () => supabase.auth.signOut(),
    fetchUserProfile,
    updateProfileAndCompleteOnboarding,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};