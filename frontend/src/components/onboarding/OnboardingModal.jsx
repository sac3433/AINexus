// ============== src/components/onboarding/OnboardingModal.jsx ==============
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient'; 
import { X, Send, ChevronRight, ChevronLeft, User, Briefcase, Brain, Settings, CheckCircle } from 'lucide-react';

// The hardcoded lists 'userTypes', 'staticAiInterestsList', and 'contentPreferencesList' are now removed.
// They will be fetched from the database.

const OnboardingModal = ({ isOpen, onClose }) => {
  const { user, profile, updateProfileAndCompleteOnboarding, fetchUserProfile } = useAuth();
  const [step, setStep] = useState(1);
  
  // State for user selections
  const [selectedUserType, setSelectedUserType] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedContentPreference, setSelectedContentPreference] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- START: New state for DB-driven configuration ---
  const [userTypesFromDB, setUserTypesFromDB] = useState([]);
  const [contentPreferencesFromDB, setContentPreferencesFromDB] = useState([]);
  const [baseInterests, setBaseInterests] = useState([]); // This will hold the former "static" list, now from DB
  const [combinedInterests, setCombinedInterests] = useState([]); // This will hold base + dynamic interests
  const [configLoading, setConfigLoading] = useState(true); // To show loading for initial config
  const [dynamicInterestsLoading, setDynamicInterestsLoading] = useState(false);
  // --- END: New state ---

  // Effect to populate component state from the user's existing profile
  useEffect(() => {
    if (profile) {
      setSelectedUserType(profile.user_type || '');
      setSelectedInterests(profile.ai_interests || []);
      setSelectedContentPreference(profile.content_preferences?.summary_style || '');
    } else if (user && isOpen) {
      fetchUserProfile(user);
    }
  }, [profile, user, isOpen, fetchUserProfile]);

  // --- START: New effect to fetch ALL initial onboarding configurations from DB ---
  useEffect(() => {
    const fetchOnboardingConfigs = async () => {
      setConfigLoading(true);
      try {
        // Fetch all configurations in parallel for efficiency
        const [userTypesRes, contentPrefsRes, baseInterestsRes] = await Promise.all([
          supabase.from('config_user_types').select('*').eq('is_enabled', true).order('display_order'),
          supabase.from('config_content_preferences').select('*').eq('is_enabled', true).order('display_order'),
          supabase.from('config_onboarding_interests').select('interest_text').eq('is_enabled', true).order('display_order')
        ]);

        if (userTypesRes.error) throw userTypesRes.error;
        if (contentPrefsRes.error) throw contentPrefsRes.error;
        if (baseInterestsRes.error) throw baseInterestsRes.error;

        setUserTypesFromDB(userTypesRes.data || []);
        setContentPreferencesFromDB(contentPrefsRes.data || []);
        
        const interests = baseInterestsRes.data ? baseInterestsRes.data.map(item => item.interest_text) : [];
        setBaseInterests(interests);
        setCombinedInterests(interests); // Initialize combined list with the base interests

      } catch (err) {
        console.error("Failed to fetch onboarding configurations:", err);
        setError("Could not load personalization options. Please try again later.");
        // Set empty arrays as fallback
        setUserTypesFromDB([]);
        setContentPreferencesFromDB([]);
        setBaseInterests([]);
      } finally {
        setConfigLoading(false);
      }
    };

    if (isOpen) {
      fetchOnboardingConfigs();
    }
  }, [isOpen]);
  // --- END: New effect to fetch configurations ---

  // Effect to fetch DYNAMIC interests (trending) for step 2
  useEffect(() => {
    const fetchDynamicInterests = async () => {
      setDynamicInterestsLoading(true);
      try {
        const { data: dynamicTagsFromServer, error: funcError } = await supabase.functions.invoke('get-onboarding-interests');
        
        if (funcError) throw funcError;

        if (dynamicTagsFromServer && Array.isArray(dynamicTagsFromServer)) {
          // Combine dynamic tags with the baseline interests fetched from the config table
          const uniqueInterests = Array.from(new Set([...dynamicTagsFromServer, ...baseInterests]));
          setCombinedInterests(uniqueInterests.slice(0, 20));
        }
        // If it fails, combinedInterests will just keep the baseInterests, which is a good fallback
      } catch (err) {
        console.error("Exception fetching dynamic interests:", err);
      } finally {
        setDynamicInterestsLoading(false);
      }
    };

    if (isOpen && step === 2) {
      fetchDynamicInterests();
    }
  }, [isOpen, step, baseInterests]); // Depend on baseInterests to ensure it's loaded first

  
  // Handlers (handleNext, handlePrev, handleInterestToggle, handleSubmit) remain the same
  // ... (copy and paste all your handler functions here without changes)
  const handleNext = () => {
    if (step === 1 && !selectedUserType) {
      setError('Please select your primary role.');
      return;
    }
    if (step === 2 && selectedInterests.length === 0) {
      setError('Please select at least one AI interest.');
      return;
    }
    if (step === 3 && !selectedContentPreference) {
      setError('Please select your content preference.');
      return;
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handlePrev = () => setStep(prev => prev - 1);

  const handleInterestToggle = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (!selectedUserType || selectedInterests.length === 0 || !selectedContentPreference) {
        setError('Please complete all steps.');
        return;
    }
    setLoading(true);
    setError('');

    const profileUpdates = {
      user_type: selectedUserType,
      ai_interests: selectedInterests,
      content_preferences: { 
        summary_style: selectedContentPreference, 
        show_technical_details: selectedUserType === 'technical'
      },
    };

    const success = await updateProfileAndCompleteOnboarding(profileUpdates);
    if (success) {
      setStep(5);
    } else {
      setError('Failed to save preferences. Please try again.');
    }
    setLoading(false);
  };
  

  const renderStepContent = () => {
    if (configLoading) {
      return <div className="text-center p-10">Loading personalization options...</div>;
    }
    if (error && step < 4) { // Show critical config error immediately
      return <p className="text-red-500 text-sm mb-4 text-center">{error}</p>;
    }

    switch (step) {
      case 1: // Welcome & User Type
        return (
          <div>
            <User size={48} className="mx-auto text-accent-teal mb-4" />
            <h2 className="text-2xl font-bold text-heading-text mb-2 text-center">Welcome to AI Nexus!</h2>
            <p className="text-center text-main-text mb-6">Let's personalize your AI information experience.</p>
            <div className="space-y-3">
              <p className="font-medium text-main-text">What's your primary role or interest?</p>
              {userTypesFromDB.map(type => ( // Use userTypesFromDB
                <button
                  key={type.id}
                  onClick={() => setSelectedUserType(type.id)}
                  className={`w-full text-left p-3 border rounded-md transition-colors ${selectedUserType === type.id ? 'bg-accent-teal text-white border-accent-teal' : 'bg-card-bg border-gray-300 hover:border-accent-teal'}`}
                >
                  <p className="font-semibold">{type.label}</p>
                  <p className="text-xs opacity-80">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 2: // AI Interests
        return (
          <div>
            <Brain size={48} className="mx-auto text-accent-teal mb-4" />
            <h2 className="text-2xl font-bold text-heading-text mb-6 text-center">What AI topics excite you?</h2>
            <p className="text-sm text-main-text mb-4 text-center">Select all that apply. This helps us curate relevant content for you.</p>
            {dynamicInterestsLoading && <p className="text-center text-main-text my-2">Loading latest trends...</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
              {combinedInterests.map(interest => ( // Use combinedInterests
                <button
                  key={interest}
                  onClick={() => handleInterestToggle(interest)}
                  className={`p-2 border rounded-md text-sm transition-colors ${selectedInterests.includes(interest) ? 'bg-accent-teal text-white border-accent-teal' : 'bg-card-bg border-gray-300 hover:border-accent-teal'}`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        );
      case 3: // Content Preferences
        return (
          <div>
            <Settings size={48} className="mx-auto text-accent-teal mb-4" />
            <h2 className="text-2xl font-bold text-heading-text mb-6 text-center">How do you prefer your insights?</h2>
             <div className="space-y-3">
              {contentPreferencesFromDB.map(pref => ( // Use contentPreferencesFromDB
                <button
                  key={pref.id}
                  onClick={() => setSelectedContentPreference(pref.id)}
                  className={`w-full text-left p-3 border rounded-md transition-colors ${selectedContentPreference === pref.id ? 'bg-accent-teal text-white border-accent-teal' : 'bg-card-bg border-gray-300 hover:border-accent-teal'}`}
                >
                  <p className="font-semibold">{pref.label}</p>
                  <p className="text-xs opacity-80">{pref.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 4: // Confirmation / Summary
        return (
         <div>
           <Briefcase size={48} className="mx-auto text-accent-teal mb-4" />
           <h2 className="text-2xl font-bold text-heading-text mb-6 text-center">Ready to Go?</h2>
           <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-md">
             {/* Find labels from the DB-fetched arrays */}
             <p><strong className="text-heading-text">Your Role:</strong> {userTypesFromDB.find(ut => ut.id === selectedUserType)?.label || 'Not set'}</p>
             <p><strong className="text-heading-text">Interests:</strong> {selectedInterests.join(', ') || 'None selected'}</p>
             <p><strong className="text-heading-text">Preference:</strong> {contentPreferencesFromDB.find(cp => cp.id === selectedContentPreference)?.label || 'Not set'}</p>
           </div>
           <p className="text-xs text-main-text mt-4 text-center">You can always update these later in your profile.</p>
         </div>
       );
      case 5: // Success
        return (
            <div className="text-center">
                <CheckCircle size={60} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-heading-text mb-2">All Set!</h2>
                <p className="text-main-text mb-6">Your AI Nexus experience is now personalized. Dive in!</p>
                <button
                    onClick={onClose}
                    className="w-full bg-accent-teal text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition duration-150 flex items-center justify-center"
                >
                    Explore AI Nexus
                </button>
            </div>
        );
      default:
        return null;
    }
  };

  // The outer modal wrapper JSX remains the same
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
      <div className="bg-card-bg p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg relative min-h-[400px] flex flex-col">
        <button onClick={onClose} className="absolute top-3 right-3 text-main-text hover:text-accent-teal" aria-label="Close onboarding modal">
          <X size={24} />
        </button>
        
        <div className="flex-grow">
         {renderStepContent()}
        </div>

        {step < 5 && !configLoading && ( // Don't show controls while config is loading
          <div className="mt-auto pt-6">
            {error && step < 4 && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            <div className="flex justify-between items-center">
              {step > 1 ? (
                <button onClick={handlePrev} className="text-accent-teal hover:underline flex items-center">
                  <ChevronLeft size={20} className="mr-1"/> Previous
                </button>
              ) : <div/>}
              {step < 4 ? (
                <button onClick={handleNext} className="bg-accent-teal text-white py-2 px-6 rounded-md hover:bg-opacity-90 transition duration-150 flex items-center">
                  Next <ChevronRight size={20} className="ml-1"/>
                </button>
              ) : step === 4 ? (
                <button onClick={handleSubmit} disabled={loading} className="bg-green-500 text-white py-2 px-6 rounded-md hover:bg-green-600 transition duration-150 flex items-center">
                  {loading ? 'Saving...' : <><Send size={18} className="mr-2"/> Personalize My Feed</>}
                </button>
              ): null}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
              <div className="bg-accent-teal h-1.5 rounded-full" style={{ width: `${(step / 4) * 100}%` }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;