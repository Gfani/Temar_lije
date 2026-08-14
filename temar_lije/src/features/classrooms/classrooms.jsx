import React, { useState, useEffect } from 'react';
import { LayoutGrid, Sparkles, LogOut, Plus, Users } from 'lucide-react';
import './classrooms.css';
import temarLijeLogo from '../../assets/temar-lije-logo.png';
import CreateClassRoom from '../../components/layout/create_class_room/create_class_room';

export default function Classrooms({ 
  currentUser = { name: 'Teacher User', role: 'Teacher' }, 
  initialClassrooms = [],
  onLogout = () => alert('Signing out...')
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('classrooms');

  
  const [classroomsList, setClassroomsList] = useState(() => {
    const saved = localStorage.getItem('temar_classrooms');
    return saved ? JSON.parse(saved) : initialClassrooms;
  });

  
  useEffect(() => {
    localStorage.setItem('temar_classrooms', JSON.stringify(classroomsList));
  }, [classroomsList]);

  const avatarInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  const handleCreateClassroom = (newClassroomData) => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newClass = {
      id: Date.now(),
      title: newClassroomData.title,
      subject: newClassroomData.subject,
      description: newClassroomData.description,
      code: randomCode
    };

    setClassroomsList((prev) => [...prev, newClass]);
  };

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    alert(`Classroom invitation code "${code}" copied to clipboard!`);
  };

  return (
    <div className="classrooms-container">
      {/* Top Navbar */}
      <header className="classrooms-header">
        <div className="header-left">
          <div className="logo-brand">
            <img src={temarLijeLogo} alt="Temar Lije Logo" className="brand-logo-img" />
            <span className="brand-title">Temar Lije</span>
          </div>

          <nav className="header-nav">
            <button 
              className={`nav-tab ${activeTab === 'classrooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('classrooms')}
            >
              <LayoutGrid size={16} />
              Classrooms
            </button>
            <button 
              className={`nav-tab ${activeTab === 'study-buddy' ? 'active' : ''}`}
              onClick={() => setActiveTab('study-buddy')}
            >
              <Sparkles size={16} /> Study Buddy
            </button>
          </nav>
        </div>

        {/* User Profile Info */}
        <div className="header-right">
          <div className="user-profile">
            <div className="avatar-circle">{avatarInitial}</div>
            <div className="user-info">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role-badge">{currentUser.role}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="classrooms-main">
        {activeTab === 'classrooms' ? (
          <>
            <div className="main-top-bar">
              <div>
                <h1 className="page-title">Your classrooms</h1>
                <p className="page-subtitle">
                  Create a classroom, share the invitation code and upload lesson materials.
                </p>
              </div>

              <button 
                className="btn-new-classroom"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={16} /> New classroom
              </button>
            </div>

            {/* Empty State vs Classroom Cards */}
            {classroomsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  No classrooms created yet
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  Click <strong>"<Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> New classroom"</strong> above to get started.
                </p>
              </div>
            ) : (
              <div className="classrooms-grid">
                {classroomsList.map((classroom) => (
                  <div className="classroom-card" key={classroom.id}>
                    <div>
                      <div className="card-top-bar"></div>
                      <h2 className="card-title">{classroom.title}</h2>
                      {classroom.subject && <p className="card-subject">{classroom.subject}</p>}
                      {classroom.description && <p className="card-description">{classroom.description}</p>}
                    </div>

                    <div className="card-footer">
                      <div className="card-type">
                        <Users size={14} />
                        <span>Classroom</span>
                      </div>

                      <span 
                        className="card-code" 
                        onClick={(e) => handleCopyCode(e, classroom.code)}
                        title="Click to copy code"
                        style={{ cursor: 'pointer' }}
                      >
                        {classroom.code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Sparkles size={24} /> Study Buddy
            </h2>
            <p>AI assistance and study companion features will load here.</p>
          </div>
        )}
      </main>

      {/* Modal Popup */}
      <CreateClassRoom 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreateClassroom}
      />
    </div>
  );
}