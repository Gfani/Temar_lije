import React, { useState } from 'react';
import './tabs/membersTab.css';

// --- Inline SVG Icons to avoid external dependencies ---

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ButterflyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 21a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 3 0v8a1.5 1.5 0 0 1-1.5 1.5z" fill="#2d3748" />
    <path d="M10.5 6.5a3.5 3.5 0 0 0-3.5 3.5c0 2.5 2 4.5 3.5 4.5V6.5z" fill="#f43f5e" />
    <path d="M13.5 6.5a3.5 3.5 0 0 1 3.5 3.5c0 2.5-2 4.5-3.5 4.5V6.5z" fill="#fb7185" />
  </svg>
);

const ReactIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none">
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(30 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(90 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(150 12 12)" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function MembersTab() {
  const [activeTab, setActiveTab] = useState('Members');
  const tabs = ['Materials', 'Live class', 'Assignments', 'Attendance', 'Quizzes', 'Members'];

  return (
    <div className="members-page-layout">
      {/* Sidebar Section */}
      <aside className="sidebar-container">
        <div className="sidebar-profile">
          <div className="sidebar-user">
            <div className="user-avatar-circle">GS</div>
            <div className="user-text">
              <span className="user-name-text">Gelila Sintayehu</span>
              <span className="user-status-text">
                <span className="online-indicator-dot"></span> online
              </span>
            </div>
          </div>
          <button type="button" className="theme-toggle-btn">
            <MoonIcon />
          </button>
        </div>

        <div className="sidebar-search">
          <div className="search-input-wrapper">
            <SearchIcon />
            <input type="text" placeholder="Search..." />
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-header">CLASSROOMS</div>
          <div className="sidebar-item active">
            <div className="item-icon green-bg">
              <ButterflyIcon />
            </div>
            <div className="item-content">
              <div className="item-title-row">
                <span className="item-title">Flutter</span>
                <span className="item-time">1:56 PM</span>
              </div>
              <p className="item-subtitle">Samuel: Post your lifecycle qu...</p>
            </div>
          </div>

          <div className="sidebar-item">
            <div className="item-icon purple-bg">
              <ReactIcon />
            </div>
            <div className="item-content">
              <div className="item-title-row">
                <span className="item-title">React Native</span>
              </div>
              <p className="item-subtitle">Mobile development</p>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-header">
            <span>STUDY GROUPS</span>
            <button type="button" className="add-group-btn"><PlusIcon /></button>
          </div>
          <div className="sidebar-item">
            <div className="item-icon purple-bg">
              <ButterflyIcon />
            </div>
            <div className="item-content">
              <div className="item-title-row">
                <span className="item-title">Widget Kings 👑</span>
                <span className="item-time">2:54 PM</span>
              </div>
              <p className="item-subtitle">Abebe: Deadline Sunday midni...</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-classroom-area">
        {/* Classroom Title Header */}
        <header className="classroom-header-bar">
          <div className="classroom-header-icon">
            <ButterflyIcon />
          </div>
          <div className="classroom-header-info">
            <h1 className="classroom-title-text">Flutter</h1>
            <p className="classroom-subtitle-text">Widget • widget structure</p>
          </div>
        </header>

        {/* Tab Sub-navigation */}
        <nav className="classroom-tabs-navigation">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`nav-tab-button ${tab === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Tab Content Area */}
        <div className="classroom-tab-content">
          {activeTab === 'Members' && (
            <div className="members-tab-view">
              {/* Start a Study Group Banner */}
              <div className="study-group-banner">
                <div className="banner-left">
                  <div className="banner-icon-circle">
                    <UsersIcon />
                  </div>
                  <div className="banner-text">
                    <h3 className="banner-title">Start a Study Group</h3>
                    <p className="banner-desc">Create a private group chat for assignments, projects, or peer study.</p>
                  </div>
                </div>
                <button type="button" className="new-group-action-btn">+ New Group</button>
              </div>

              {/* Teachers Section */}
              <section className="members-section">
                <h4 className="section-title">TEACHERS (1)</h4>
                <div className="member-card-row">
                  <div className="member-avatar sm-bg">SM</div>
                  <div className="member-details">
                    <div className="member-name-row">
                      <span className="member-name-text">Samuel Mekonnen</span>
                      <span className="teacher-badge-label">Teacher</span>
                    </div>
                    <span className="member-status-text">
                      <span className="online-indicator-dot"></span> online now
                    </span>
                  </div>
                </div>
              </section>

              {/* Students Online Section */}
              <section className="members-section">
                <h4 className="section-title">STUDENTS • ONLINE (5)</h4>
                <div className="members-list-stack">
                  <div className="member-card-row">
                    <div className="member-avatar gs-bg">GS</div>
                    <div className="member-details">
                      <div className="member-name-row">
                        <span className="member-name-text">Gelila Sintayehu</span>
                        <span className="you-badge-label">(you)</span>
                      </div>
                      <span className="member-status-text">
                        <span className="online-indicator-dot"></span> online now
                      </span>
                    </div>
                  </div>

                  <div className="member-card-row">
                    <div className="member-avatar at-bg">AT</div>
                    <div className="member-details">
                      <span className="member-name-text">Abebe Tadesse</span>
                      <span className="member-status-text">
                        <span className="online-indicator-dot"></span> online now
                      </span>
                    </div>
                  </div>

                  <div className="member-card-row">
                    <div className="member-avatar yb-bg">YB</div>
                    <div className="member-details">
                      <span className="member-name-text">Yonas Bekele</span>
                      <span className="member-status-text">
                        <span className="online-indicator-dot"></span> online now
                      </span>
                    </div>
                  </div>

                  <div className="member-card-row">
                    <div className="member-avatar ta-bg">TA</div>
                    <div className="member-details">
                      <span className="member-name-text">Tigist Alemu</span>
                      <span className="member-status-text">
                        <span className="online-indicator-dot"></span> online now
                      </span>
                    </div>
                  </div>

                  <div className="member-card-row">
                    <div className="member-avatar ht-bg">HT</div>
                    <div className="member-details">
                      <span className="member-name-text">Hana Tesfaye</span>
                      <span className="member-status-text">
                        <span className="online-indicator-dot"></span> online now
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Students Offline Section */}
              <section className="members-section">
                <h4 className="section-title">STUDENTS • OFFLINE (2)</h4>
                <div className="members-list-stack">
                  <div className="member-card-row offline">
                    <div className="member-avatar mh-bg">MH</div>
                    <div className="member-details">
                      <span className="member-name-text">Meron Haile</span>
                      <span className="member-status-text">
                        <span className="offline-indicator-dot"></span> last seen 2h ago
                      </span>
                    </div>
                  </div>

                  <div className="member-card-row offline">
                    <div className="member-avatar dg-bg">DG</div>
                    <div className="member-details">
                      <span className="member-name-text">Dawit Girma</span>
                      <span className="member-status-text">
                        <span className="offline-indicator-dot"></span> last seen 1d ago
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
