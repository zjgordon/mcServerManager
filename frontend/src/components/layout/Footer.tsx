import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-minecraft-green rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Minecraft Server Manager v0.1.0-alpha
              </p>
              <p className="text-xs text-gray-500">
                Built with React, TypeScript, and shadcn/ui
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              to="/docs" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Documentation
            </Link>
            <Link 
              to="/support" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Support
            </Link>
            <Link 
              to="/privacy" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Privacy
            </Link>
            <Link 
              to="/terms" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            © 2024-2025 Minecraft Server Manager. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
