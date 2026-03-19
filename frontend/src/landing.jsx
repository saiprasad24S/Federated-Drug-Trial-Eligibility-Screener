import React from 'react';
import Navbar from './landing/Navbar';
import Hero from './landing/Hero';
import BentoGrid from './landing/BentoGrid';
import FAQSection from './landing/FAQSection';
import AboutSection from './landing/AboutSection';
import ContactSection from './landing/ContactSection';
import Footer from './landing/Footer';
import GlowCursor from './landing/GlowCursor';

const LandingPage = ({ onLoginClick }) => {
  return (
    <div className="w-full overflow-hidden">
      <GlowCursor />
      <Navbar onLoginClick={onLoginClick} />
      <Hero onCTAClick={onLoginClick} />
      <BentoGrid />
      <FAQSection />
      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
