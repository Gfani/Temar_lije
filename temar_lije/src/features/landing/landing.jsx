import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, GraduationCap, FileText, Video, LogIn, Users, UserPlus, Mail, ArrowRight, ShieldCheck, Zap, Globe, BookOpen } from 'lucide-react';
import './landing.css'; 
import temarLijeLogo from '../../assets/temar-lije-logo.png';
import heroClassroom from '../../assets/hero-classroom.png';

const ROTATING_PHRASES = [
  'Administrate less.',
  'Inspire your students.',
  'Auto-grade in seconds.',
  'Collaborate in real time.',
  'Empower digital education.',
];

export default function LandingPage({ 
  onStartTeaching = () => {}, 
  onJoinClass = () => {}, 
  onSignIn = () => {},
  onEscapePress 
}) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [fadeState, setFadeState] = useState('fade-in');

  // Kinetic Rotating Word Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState('fade-out');
      setTimeout(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
        setFadeState('fade-in');
      }, 350);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  // ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (onEscapePress) {
          onEscapePress();
        } else {
          onSignIn();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEscapePress, onSignIn]);

  return (
    <div className="landing-container kinetic-mode">
      {/* Navbar Header */}
      <header className="landing-header">
        <div className="landing-logo-brand">
          <img src={temarLijeLogo} alt="Temar Lije Logo" className="header-logo-img" />
          <span className="landing-brand-title">Temar Lije</span>
        </div>

        <button className="btn-signin" onClick={onSignIn} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <LogIn size={16} /> Sign in
        </button>
      </header>

      {/* Main Hero Section with Kinetic Motion */}
      <main className="landing-hero">
        <div className="hero-content">
          <div className="ai-badge kinetic-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} className="sparkle-icon" /> AI-Powered Smart Classroom
          </div>

          <h1 className="hero-headline kinetic-headline">
            Teach more. <br />
            <span className={`headline-rotating ${fadeState}`}>
              {ROTATING_PHRASES[currentPhraseIndex]}
            </span>
          </h1>

          <p className="hero-description">
            Temar Lije puts classroom management, lesson materials, real-time collaboration, 
            and live teaching in one place — with built-in AI assistants so teachers spend their 
            time inspiring students, not doing paperwork.
          </p>

          <div className="hero-actions">
            <button className="btn-start-teaching kinetic-btn" onClick={onStartTeaching}>
              <GraduationCap size={18} /> Start teaching free
              <ArrowRight size={16} className="btn-arrow" />
            </button>
            <button className="btn-join-class kinetic-btn-secondary" onClick={onJoinClass}>
              <Users size={18} /> Join a class
            </button>
          </div>
        </div>

        <div className="hero-media-wrapper">
          <div className="hero-motion-card">
            <img src={heroClassroom} alt="Classroom learning with teacher" className="hero-classroom-img" />
          </div>
        </div>
      </main>

      {/* Kinetic Stats Strip */}
      <section className="stats-strip">
        <div className="stat-pill">
          <Zap size={18} className="stat-icon teal" />
          <div className="stat-info">
            <span className="stat-val">Sub-50ms</span>
            <span className="stat-lbl">Real-Time Sync</span>
          </div>
        </div>

        <div className="stat-pill">
          <ShieldCheck size={18} className="stat-icon purple" />
          <div className="stat-info">
            <span className="stat-val">100% Isolated</span>
            <span className="stat-lbl">Student Study Groups</span>
          </div>
        </div>

        <div className="stat-pill">
          <BookOpen size={18} className="stat-icon blue" />
          <div className="stat-info">
            <span className="stat-val">Instant AI</span>
            <span className="stat-lbl">Quiz & Assessment Engine</span>
          </div>
        </div>

        <div className="stat-pill">
          <Globe size={18} className="stat-icon green" />
          <div className="stat-info">
            <span className="stat-val">99.9% Uptime</span>
            <span className="stat-lbl">Azure Cloud Infrastructure</span>
          </div>
        </div>
      </section>

      {/* Feature Section: Staggered Kinetic Cards */}
      <section className="features-section">
        <h2 className="section-title">Built for real teaching days</h2>
        
        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card kinetic-card delay-1">
            <div className="feature-icon-badge"><GraduationCap size={24} /></div>
            <h3 className="feature-card-title">Classrooms in seconds</h3>
            <p className="feature-card-desc">
              Create a class, share a six-character invite code and watch students join automatically.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-card kinetic-card delay-2">
            <div className="feature-icon-badge"><FileText size={24} /></div>
            <h3 className="feature-card-title">Materials, organised</h3>
            <p className="feature-card-desc">
              Upload slides, PDFs, voice notes, and worksheets with byte-range audio streaming.
            </p>
          </div>

          {/* Card 3 */}
          <div className="feature-card kinetic-card delay-3">
            <div className="feature-icon-badge"><Video size={24} /></div>
            <h3 className="feature-card-title">Live teaching built in</h3>
            <p className="feature-card-desc">
              Every classroom has its own live room with low-latency chat, attendance, and screen sharing.
            </p>
          </div>

          {/* Card 4 */}
          <div className="feature-card kinetic-card delay-4">
            <div className="feature-icon-badge"><Sparkles size={24} /></div>
            <h3 className="feature-card-title">AI on your side</h3>
            <p className="feature-card-desc">
              Automated quiz generation, curriculum recommendations, and AI Study Buddy support.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="cta-banner">
        <h2 className="cta-title">Ready to save time and inspire your students?</h2>
        <p className="cta-subtitle">
          Join thousands of teachers transforming their digital classrooms today. No credit card required.
        </p>
        <div className="cta-actions">
          <button className="btn-cta-primary" onClick={onStartTeaching} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={18} /> Sign up free
          </button>
          <button className="btn-cta-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={18} /> Contact sales
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-header">
              <img src={temarLijeLogo} alt="Temar Lije Logo" className="footer-logo-img" />
              <span className="footer-brand-title">Temar Lije</span>
            </div>
            <p className="footer-brand-desc">
              Making classroom management simple, delightful, and integrated with the next generation of AI support tools.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-column">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#copilot">AI Co-pilot</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Resources</h4>
              <ul>
                <li><a href="#guides">Teacher Guides</a></li>
                <li><a href="#help">Help Center</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Temar Lije Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}