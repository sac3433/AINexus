// src/components/Footer.jsx
import React from 'react';
import { Github, Linkedin, Twitter } from 'lucide-react'; // Example social icons

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="relative z-10 bg-slate-900/70 backdrop-blur-sm text-slate-300 mt-0"> 
      {/* - Removed 'mt-12' as spacing will be handled by the reveal spacer in HomePage.jsx
        - Changed background to be semi-transparent dark with blur for overlay.
        - Changed text color to be light for readability on a dark/image background.
      */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h5 className="font-bold text-lg text-white mb-3">AI Nexus</h5>
            <p className="text-sm">
              Your Personalized Hub for AI Intelligence & Advancement.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-lg text-white mb-3">Quick Links</h5>
            <ul className="space-y-1">
              <li><a href="/about" className="hover:text-accent-teal transition-colors">About Us</a></li>
              <li><a href="/contact" className="hover:text-accent-teal transition-colors">Contact</a></li>
              <li><a href="/privacy" className="hover:text-accent-teal transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-accent-teal transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-lg text-white mb-3">Connect</h5>
            <div className="flex justify-center md:justify-start space-x-4">
              <a href="#" className="hover:text-accent-teal transition-colors" aria-label="GitHub">
                <Github size={24} />
              </a>
              <a href="#" className="hover:text-accent-teal transition-colors" aria-label="LinkedIn">
                <Linkedin size={24} />
              </a>
              <a href="#" className="hover:text-accent-teal transition-colors" aria-label="Twitter">
                <Twitter size={24} />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm">
          <p>&copy; {currentYear} AI Nexus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
