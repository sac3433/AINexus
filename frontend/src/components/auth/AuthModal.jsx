// ============== src/components/auth/AuthModal.jsx ==============
import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { X } from 'lucide-react';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card-bg p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-main-text hover:text-accent-teal"
          aria-label="Close authentication modal"
        >
          <X size={24} />
        </button>
        {isLoginView ? (
          <LoginForm switchToRegister={() => setIsLoginView(false)} onClose={onClose} />
        ) : (
          <RegisterForm switchToLogin={() => setIsLoginView(true)} onClose={onClose} />
        )}
      </div>
    </div>
  );
};

export default AuthModal;