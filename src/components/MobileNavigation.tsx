'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface MobileNavigationProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export default function MobileNavigation({
  currentPage = 'dashboard',
  onNavigate,
}: MobileNavigationProps) {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/dashboard' },
    { id: 'projects', label: 'Projetos', icon: '📁', href: '/dashboard' },
    { id: 'videos', label: 'Vídeos', icon: '🎥', href: '/dashboard' },
    { id: 'editor', label: 'Editor', icon: '✏️', href: '/editor' },
    { id: 'analytics', label: 'Analytics', icon: '📊', href: '/dashboard' },
    { id: 'templates', label: 'Templates', icon: '🎨', href: '/templates' },
    { id: 'settings', label: 'Configurações', icon: '⚙️', href: '/dashboard/settings' },
    { id: 'profile', label: 'Perfil', icon: '👤', href: '/dashboard/profile' },
  ];

  const handleNavigation = (page: string, href: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = href;
    }
    setIsMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
    setIsMenuOpen(false);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-6 h-5 flex flex-col justify-center space-y-1">
                <div
                  className={`w-full h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}
                ></div>
                <div
                  className={`w-full h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}
                ></div>
                <div
                  className={`w-full h-0.5 bg-gray-600 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}
                ></div>
              </div>
            </button>
            <h1 className="text-lg font-bold text-gray-900 truncate">TécnicoCursos</h1>
          </div>

          {session && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {session.user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl overflow-hidden">
            <div className="p-4 bg-blue-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {session && (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-medium">
                      {session.user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{session.user?.name}</p>
                    <p className="text-sm text-blue-100">{session.user?.email}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              <nav className="p-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id, item.href)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="font-medium">Sair</span>
                </button>
              </div>
            </div>
          </div>

          <div
            className="fixed inset-0 bg-black bg-opacity-50 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          ></div>
        </div>
      )}

      {/* Bottom Tab Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-5 gap-1">
          {[
            { id: 'dashboard', icon: '🏠', label: 'Home' },
            { id: 'projects', icon: '📁', label: 'Projetos' },
            { id: 'editor', icon: '➕', label: 'Criar' },
            { id: 'videos', icon: '🎥', label: 'Vídeos' },
            { id: 'analytics', icon: '📊', label: 'Stats' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                const item = menuItems.find((m) => m.id === tab.id);
                if (item) handleNavigation(tab.id, item.href);
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                currentPage === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
