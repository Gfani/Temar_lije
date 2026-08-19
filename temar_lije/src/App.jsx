import React, { useState, useEffect } from 'react';
import Landingpage from './features/landing/landing.jsx';
import SignInPage from './features/auth/signin/signin.jsx';
import CreateAccountPage from './features/auth/create_account/create_account.jsx';
import Classrooms from './features/classrooms/classrooms.jsx';
import ClassroomDetail from './features/classroom-detail/classroom_detail.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

function MainApp() {
  const { user, login, register, logout, isAuthenticated, isLoading } = useAuth();

  // Track active screen: 'landing' | 'signin' | 'create_account' | 'classrooms' | 'classroom_detail'
  const [currentScreen, setCurrentScreen] = useState(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path.includes('/oauth/callback')) return 'classrooms';
    if (path.includes('/join/')) {
      // Stash the invite id; chat.jsx consumes it once groups are loaded
      const inviteId = decodeURIComponent(path.split('/join/')[1].split('/')[0]);
      if (inviteId) {
        sessionStorage.setItem('pending_join_id', inviteId);
      }
      return localStorage.getItem('temar_user') ? 'classrooms' : 'signin';
    }
    if (path.includes('/signin') || search.includes('error=oauth_failed')) return 'signin';
    return localStorage.getItem('temar_user') ? 'classrooms' : 'landing';
  });
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [initialEmail, setInitialEmail] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle OAuth callback resolution
  useEffect(() => {
    if (window.location.pathname.includes('/oauth/callback')) {
      if (!isLoading) {
        if (isAuthenticated) {
          setCurrentScreen('classrooms');
          window.history.replaceState({}, '', '/');
        } else {
          setCurrentScreen('signin');
          window.history.replaceState({}, '', '/signin?error=oauth_failed&message=Authentication%20failed');
        }
      }
    }
  }, [isAuthenticated, isLoading]);

  // Sync screen with auth state if user logs out or session expires
  useEffect(() => {
    if (!isLoading && !isAuthenticated && (currentScreen === 'classrooms' || currentScreen === 'classroom_detail')) {
      setCurrentScreen('landing');
    }
  }, [isAuthenticated, isLoading, currentScreen]);

  const handleSignIn = async ({ email, password }) => {
    await login({ email, password });
    setAuthNotice('');
    setCurrentScreen('classrooms');
  };

  const handleCreateAccount = async ({ fullName, role, email, password }) => {
    // Register without auto-login so user gets redirected to sign-in page
    await register({ fullName, role, email, password, autoLogin: false });
    setInitialEmail(email);
    setAuthNotice('Account created successfully! Please sign in with your credentials.');
    setCurrentScreen('signin');
  };

  const handleLogout = async () => {
    await logout();
    setAuthNotice('');
    setCurrentScreen('landing');
  };

  const currentUser = user
    ? {
        name: user.fullName || 'User',
        role: user.role === 'TEACHER' ? 'Teacher' : 'Student',
        email: user.email,
      }
    : { name: 'User', role: 'Student' };

  return (
    <div>
      {currentScreen === 'landing' && (
        <Landingpage 
          onSignIn={() => {
            setAuthNotice('');
            setCurrentScreen('signin');
          }} 
          onStartTeaching={() => {
            setAuthNotice('');
            setCurrentScreen('signin');
          }}
          onJoinClass={() => {
            setAuthNotice('');
            setCurrentScreen('signin');
          }}
        />
      )}

      {currentScreen === 'signin' && (
        <SignInPage 
          onSignIn={handleSignIn}
          onBackToLanding={() => setCurrentScreen('landing')} 
          onSwitchToCreateAccount={() => {
            setAuthNotice('');
            setCurrentScreen('create_account');
          }}
          initialEmail={initialEmail}
          noticeMessage={authNotice}
        />
      )}

      {currentScreen === 'create_account' && (
        <CreateAccountPage 
          onCreateAccount={handleCreateAccount}
          onSwitchToSignIn={() => {
            setAuthNotice('');
            setCurrentScreen('signin');
          }} 
        />
      )}

      {currentScreen === 'classrooms' && (
        <Classrooms 
          currentUser={currentUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onSelectClassroom={(classroom) => {
            setSelectedClassroom(classroom);
            setCurrentScreen('classroom_detail');
          }}
          onLogout={handleLogout} 
        />
      )}

      {currentScreen === 'classroom_detail' && (
        <ClassroomDetail 
          currentUser={currentUser}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          classroom={selectedClassroom || { title: "Flutter", subject: "Widget · widget structure" }}
          onBackToClassrooms={() => setCurrentScreen('classrooms')}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
