// ============== src/components/Header.jsx ==============
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './auth/AuthModal';
import { LogIn, LogOut, UserCircle, Search, Menu, X } from 'lucide-react'; 

const Header = () => {
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Feed', path: '/' },
    { name: 'Events', path: '/events' }, 
    { name: 'Video Insights', path: '/videos' }, 
    { name: 'Discover', path: '/discover' }, 
  ];

  return (
    <>
      <header className="bg-card-bg shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold text-accent-teal">
              AI Nexus
            </Link>

            <nav className="hidden md:flex items-center space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="px-3 py-2 rounded-md text-sm font-medium text-heading-text hover:text-accent-teal hover:bg-warm-off-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center space-x-3">
              <button className="p-2 text-main-text hover:text-accent-teal rounded-full hover:bg-warm-off-white">
                <Search size={20} />
              </button>
              {user ? (
                <div className="relative group">
                   <button className="p-1 bg-accent-teal text-white rounded-full flex items-center justify-center w-8 h-8">
                    {user.email ? user.email.charAt(0).toUpperCase() : <UserCircle size={20}/>}
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-card-bg rounded-md shadow-lg py-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-main-text hover:bg-warm-off-white">My Profile</Link>
                    <button
                      onClick={signOut}
                      className="w-full text-left block px-4 py-2 text-sm text-main-text hover:bg-warm-off-white"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-accent-teal text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-colors flex items-center"
                >
                  <LogIn size={16} className="mr-1.5" /> Login / Sign Up
                </button>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => user ? null : setIsAuthModalOpen(true)} className="p-2 text-main-text hover:text-accent-teal mr-2">
                 {user ? (
                    <Link to="/profile"> {/* Or some other action for logged in user on mobile */}
                        <div className="p-1 bg-accent-teal text-white rounded-full flex items-center justify-center w-8 h-8">
                            {user.email ? user.email.charAt(0).toUpperCase() : <UserCircle size={20}/>}
                        </div>
                    </Link>
                 ) : <LogIn size={20} /> }
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-main-text hover:text-accent-teal"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-card-bg shadow-lg">
            <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-heading-text hover:text-accent-teal hover:bg-warm-off-white"
                >
                  {link.name}
                </Link>
              ))}
               <button className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-heading-text hover:text-accent-teal hover:bg-warm-off-white">
                Search
              </button>
              {user && (
                 <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-main-text hover:bg-warm-off-white"
                >
                    My Profile
                </Link>
              )}
              {user && (
                 <button
                    onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-main-text hover:bg-warm-off-white"
                >
                    Logout
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
      <AuthModal isOpen={isAuthModalOpen && !user} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default Header;