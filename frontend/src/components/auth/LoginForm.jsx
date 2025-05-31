// ============== src/components/auth/LoginForm.jsx ==============
import React, { useState } from 'react';
// useAuth is now directly imported where needed, no duplicate import here
// import { useAuth } from '../../contexts/AuthContext'; 
import { Mail, Lock, LogIn, Github, Chrome } from 'lucide-react'; // Chrome for Google
import { useAuth as useAuthLogin } from '../../contexts/AuthContext'; // Aliased import

const LoginForm = ({ switchToRegister, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithPassword, signIn } = useAuthLogin(); // Use aliased hook

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: loginError } = await signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
    } else {
      onClose(); 
    }
    setLoading(false);
  };

  const handleOAuth = async (provider) => {
    setError('');
    setLoading(true);
    const { error: oauthError } = await signIn({ provider });
    if (oauthError) {
      setError(oauthError.message);
    }
    // OAuth redirects, modal will close if successful or error will be handled by Supabase redirect
    setLoading(false); 
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-heading-text mb-6 text-center">Welcome Back!</h2>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-accent-teal focus:border-accent-teal"
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-accent-teal focus:border-accent-teal"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-teal text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition duration-150 flex items-center justify-center"
        >
          {loading ? 'Logging in...' : <><LogIn size={18} className="mr-2"/> Login</>}
        </button>
      </form>
      <div className="my-6 text-center">
        <span className="text-sm text-gray-500">OR CONTINUE WITH</span>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => handleOAuth('google')}
          disabled={loading}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition duration-150 flex items-center justify-center"
        >
         <Chrome size={18} className="mr-2"/> Sign in with Google
        </button>
        <button
          onClick={() => handleOAuth('github')}
          disabled={loading}
          className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 transition duration-150 flex items-center justify-center"
        >
          <Github size={18} className="mr-2"/> Sign in with GitHub
        </button>
      </div>
      <p className="mt-6 text-center text-sm">
        Don't have an account?{' '}
        <button onClick={switchToRegister} className="font-medium text-accent-teal hover:underline">
          Sign Up
        </button>
      </p>
    </div>
  );
};

export default LoginForm;