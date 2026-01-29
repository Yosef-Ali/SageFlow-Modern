import React from 'react';
import '@/styles/landing.css';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Stats from '@/components/landing/Stats';
import Features from '@/components/landing/Features';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';

export default function Landing() {
  return (
    <div className="landing-page min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans antialiased selection:bg-emerald-500/30">
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
  );
}
