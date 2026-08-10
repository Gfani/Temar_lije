import React from 'react';
import './footer.css';
import logo from '../../../assets/classmind-logo.png';

export default function Footer() {
    return (
        <footer className="classmind-footer">
            {/* Top CTA Banner */}
            <div className="footer-cta-banner">
                <h2 className="cta-title">Ready to save time and inspire your students?</h2>
                <p className="cta-subtitle">
                    Join thousands of teachers transforming their digital classrooms today. No credit card required.
                </p>
                <div className="cta-buttons">
                    <button type="button" className="cta-btn btn-primary">Sign up free</button>
                    <button type="button" className="cta-btn btn-secondary">Contact sales</button>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="footer-main-content">
                <div className="footer-brand-section">
                    <div className="footer-logo-container">
                        <img src={logo} alt="Classmod Logo" className="footer-logo-image" />
                        <span className="footer-logo-text">Temar lije</span>
                    </div>
                    <p className="footer-brand-description">
                        Making classroom management simple, delightful, and integrated with the next generation of AI support tools.
                    </p>
                </div>

                <div className="footer-links-section">
                    <div className="footer-links-col">
                        <h4 className="links-col-title">Product</h4>
                        <ul className="links-col-list">
                            <li><a href="#features">Features</a></li>
                            <li><a href="#ai-copilot">AI Co-pilot</a></li>
                            <li><a href="#pricing">Pricing</a></li>
                            <li><a href="#changelog">Changelog</a></li>
                        </ul>
                    </div>

                    <div className="footer-links-col">
                        <h4 className="links-col-title">Resources</h4>
                        <ul className="links-col-list">
                            <li><a href="#guides">Teacher Guides</a></li>
                            <li><a href="#help">Help Center</a></li>
                            <li><a href="#community">Community</a></li>
                            <li><a href="#security">Security</a></li>
                        </ul>
                    </div>

                    <div className="footer-links-col">
                        <h4 className="links-col-title">Company</h4>
                        <ul className="links-col-list">
                            <li><a href="#about">About us</a></li>
                            <li><a href="#blog">Blog</a></li>
                            <li><a href="#careers">Careers</a></li>
                            <li><a href="#contact">Contact</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Footer Bottom Row */}
            <div className="footer-bottom-row">
                <span className="footer-copyright">© 2026 Classmod Inc. All rights reserved.</span>
                <div className="footer-legal-links">
                    <a href="#privacy">Privacy Policy</a>
                    <a href="#terms">Terms of Service</a>
                    <a href="#compliance">FERPA & COPPA Compliance</a>
                </div>
            </div>
        </footer>
    );
}
