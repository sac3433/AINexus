// ============== src/hooks/useAuth.js ==============
// (This is a simple re-export, often people put the context and hook in the same file)
// For simplicity, the useAuth hook is defined within AuthContext.jsx above.
// If you prefer a separate file:
/*
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext'; // Adjust path if necessary

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
*/