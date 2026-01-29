import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import Pricing from './components/Pricing';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] selection:bg-emerald-500/20 transition-colors duration-300">
        <Navbar />
        <main>
          <Hero />
          <Stats />
          <Features />
          <Testimonials />
          <Pricing />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default App;
