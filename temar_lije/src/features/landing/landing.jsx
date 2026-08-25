import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, GraduationCap, FileText, Video, LogIn, Users, UserPlus, Mail, Radio, Mic, Zap } from 'lucide-react';
import ParticleCanvas from '../../components/ParticleCanvas/ParticleCanvas';
import './landing.css'; 
import temarLijeLogo from '../../assets/temar-lije-logo.png';
import heroClassroom from '../../assets/hero-classroom.png';

export default function LandingPage({ 
  onStartTeaching = () => {}, 
  onJoinClass = () => {}, 
  onSignIn = () => {},
  onEscapePress 
}) {
  // 3D Tilt State for Hero Media
  const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const heroCardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xPct = x / rect.width;
    const yPct = y / rect.height;

    const rotX = ((yPct - 0.5) * -16).toFixed(2);
    const rotY = ((xPct - 0.5) * 18).toFixed(2);

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease-out',
    });

    setGlarePos({
      x: (xPct * 100).toFixed(1),
      y: (yPct * 100).toFixed(1),
      opacity: 0.35,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
    });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

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
    <div className="landing-container">
      {/* 3D Interactive Particle Constellation Canvas */}
      <ParticleCanvas />

      {/* Background Animated Aurora Glows */}
      <div className="aurora-glow glow-1" />
      <div className="aurora-glow glow-2" />
      <div className="aurora-glow glow-3" />

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

      {/* Main Hero Section */}
      <main className="landing-hero">
        <div className="hero-content">
          <div className="ai-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} className="sparkle-icon-animated" /> AI-powered smart classroom
          </div>

          <h1 className="hero-headline">
            Teach more. <span className="headline-gradient">Administrate less.</span>
          </h1>

          <p className="hero-description">
            Temar Lije puts classroom management, lesson materials and live teaching in 
            one place — then adds AI assistants so teachers spend their time with 
            students, not paperwork.
          </p>

          <div className="hero-actions">
            <button className="btn-start-teaching" onClick={onStartTeaching} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <GraduationCap size={18} /> Start teaching
            </button>
            <button className="btn-join-class" onClick={onJoinClass} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Users size={18} /> Join a class
            </button>
          </div>
        </div>

        {/* 3D Interactive Hero Media Card with Floating Badges */}
        <div className="hero-media-wrapper">
          <div 
            className="hero-3d-card"
            ref={heroCardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={tiltStyle}
          >
            {/* Dynamic Light Glare */}
            <div 
              className="hero-glare-effect"
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 65%)`,
                opacity: glarePos.opacity,
              }}
            />

            <img src={heroClassroom} alt="Classroom learning with teacher" className="hero-classroom-img" />

            {/* Floating 3D Badge 1: Live Class */}
            <div className="floating-badge badge-top-left">
              <span className="live-indicator-dot" />
              <div className="badge-text-col">
                <span className="badge-title">Live Class Active</span>
                <span className="badge-sub">24 Students Connected</span>
              </div>
            </div>

            {/* Floating 3D Badge 2: AI Quiz Assistant */}
            <div className="floating-badge badge-bottom-right">
              <div className="badge-icon-wrap ai-purple">
                <Zap size={14} />
              </div>
              <div className="badge-text-col">
                <span className="badge-title">AI Quiz Engine</span>
                <span className="badge-sub">Generated in 1.2s</span>
              </div>
            </div>

            {/* Floating 3D Badge 3: Voice Note */}
            <div className="floating-badge badge-bottom-left">
              <div className="badge-icon-wrap voice-green">
                <Mic size={14} />
              </div>
              <div className="badge-audio-wave">
                <span className="wave-bar b1" />
                <span className="wave-bar b2" />
                <span className="wave-bar b3" />
                <span className="wave-bar b4" />
              </div>
              <span className="badge-sub" style={{ marginLeft: '4px' }}>0.3s Sync</span>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Section: Built for real teaching days */}
      <section className="features-section">
        <h2 className="section-title">Built for real teaching days</h2>
        
        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card">
            <div className="feature-icon-badge"><GraduationCap size={24} /></div>
            <h3 className="feature-card-title">Classrooms in seconds</h3>
            <p className="feature-card-desc">
              Create a class, share a six-character code and watch students join themselves.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-card">
            <div className="feature-icon-badge"><FileText size={24} /></div>
            <h3 className="feature-card-title">Materials, organised</h3>
            <p className="feature-card-desc">
              Upload slides, PDFs and worksheets. Students only see the classes they belong to.
            </p>
          </div>

          {/* Card 3 */}
          <div className="feature-card">
            <div className="feature-icon-badge"><Video size={24} /></div>
            <h3 className="feature-card-title">Live teaching built in</h3>
            <p className="feature-card-desc">
              Every classroom has its own video room with screen sharing and chat.
            </p>
          </div>

          {/* Card 4 */}
          <div className="feature-card">
            <div className="feature-icon-badge"><Sparkles size={24} /></div>
            <h3 className="feature-card-title">AI on your side</h3>
            <p className="feature-card-desc">
              Lesson planning, quiz generation and analytics arrive on this same foundation.
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