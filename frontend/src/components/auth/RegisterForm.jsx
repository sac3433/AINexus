// ============== src/components/auth/RegisterForm.jsx ==============
import React, { useState } from 'react';
// import { useAuth } from '../../contexts/AuthContext'; // Corrected path
import { Mail, Lock, UserPlus, Github, Chrome } from 'lucide-react';
import { useAuth as useAuthRegister } from '../../contexts/AuthContext'; // Aliased import


const RegisterForm = ({ switchToLogin, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuthRegister(); // Use aliased hook

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    const { error: signUpError } = await signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setMessage("Registration successful! Please check your email to confirm your account.");
      // onClose(); // Keep modal open to show message
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
    setLoading(false);
  };


  return (
    <div>
      <h2 className="text-2xl font-bold text-heading-text mb-6 text-center">Create Your AI Nexus Account</h2>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      {message && <p className="text-green-500 text-sm mb-4 text-center">{message}</p>}
      <form onSubmit={handleRegister} className="space-y-4">
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
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-accent-teal focus:border-accent-teal"
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-accent-teal focus:border-accent-teal"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-teal text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition duration-150 flex items-center justify-center"
        >
          {loading ? 'Registering...' : <><UserPlus size={18} className="mr-2"/> Sign Up</>}
        </button>
      </form>
       <div className="my-6 text-center">
        <span className="text-sm text-gray-500">OR SIGN UP WITH</span>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => handleOAuth('google')}
          disabled={loading}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition duration-150 flex items-center justify-center"
        >
         <Chrome size={18} className="mr-2"/> Sign up with Google
        </button>
        <button
          onClick={() => handleOAuth('github')}
          disabled={loading}
          className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900 transition duration-150 flex items-center justify-center"
        >
          <Github size={18} className="mr-2"/> Sign up with GitHub
        </button>
      </div>
      <p className="mt-6 text-center text-sm">
        Already have an account?{' '}
        <button onClick={switchToLogin} className="font-medium text-accent-teal hover:underline">
          Login
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;