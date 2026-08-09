import React from 'react';
import './header.css';
import logo from '../../../assets/classmind-logo.png';


// --- Inline SVG Icons to avoid external dependencies ---

const GraduationCapIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
);

const GridIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
);

const SparklesIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
);

const LogOutIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

export default function Header({
    userName = "Gelila Sintayehu",
    role = "Student",
    userInitials = "GS",
    currentTab = "classrooms",
    onTabChange,
    onLogout
}) {
    return (
        <header className="classmind-header">
            <div className="header-left">
                <div className="logo-container">
    <img src={logo} alt="ClassMind-Logo" className="logo-image" />
    <span className="logo-text">Temar Lije</span>
</div>


                <nav className="header-nav">
                    <button
                        type="button"
                        className={`nav-item ${currentTab === 'classrooms' ? 'active' : ''}`}
                        onClick={() => onTabChange?.('classrooms')}
                    >
                        <GridIcon />
                        <span>Classrooms</span>
                    </button>

                    <button
                        type="button"
                        className={`nav-item ${currentTab === 'study-buddy' ? 'active' : ''}`}
                        onClick={() => onTabChange?.('study-buddy')}
                    >
                        <SparklesIcon />
                        <span>Study Buddy</span>
                    </button>
                </nav>
            </div>

            <div className="header-right">
                <div className="user-profile">
                    <div className="avatar">
                        {userInitials}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{userName}</span>
                        <span className="user-role">{role}</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="logout-button"
                    onClick={onLogout}
                    title="Log Out"
                    aria-label="Log Out"
                >
                    <LogOutIcon />
                </button>
            </div>
        </header>
    );
}
