import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen font-sans selection:bg-gold-400 selection:text-luxury-black transition-colors duration-500">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 overflow-x-hidden relative">
          {/* Subtle gold gradient glow in background */}
          <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gold-600/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-gold-400/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 animate-fade-in max-w-[1600px] mx-auto text-luxury-text">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
