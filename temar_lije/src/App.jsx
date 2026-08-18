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
    return localStorage.getItem('temar_user') ? 'classrooms' : 'landing';
  });
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync screen with auth state if user logs out or session expires
  useEffect(() => {
    if (!isLoading && !isAuthenticated && (currentScreen === 'classrooms' || currentScreen === 'classroom_detail')) {
      setCurrentScreen('landing');
    }
  }, [isAuthenticated, isLoading, currentScreen]);

  const handleSignIn = async ({ email, password }) => {
    await login({ email, password });
    setCurrentScreen('classrooms');
  };

  const handleCreateAccount = async ({ fullName, role, email, password }) => {
    await register({ fullName, role, email, password });
    setCurrentScreen('classrooms');
  };

  const handleLogout = async () => {
    await logout();
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
          onSignIn={() => setCurrentScreen('signin')} 
          onStartTeaching={() => setCurrentScreen('signin')}
          onJoinClass={() => setCurrentScreen('signin')}
        />
      )}

      {currentScreen === 'signin' && (
        <SignInPage 
          onSignIn={handleSignIn}
          onGoogleSignIn={() => setCurrentScreen('classrooms')}
          onBackToLanding={() => setCurrentScreen('landing')} 
          onSwitchToCreateAccount={() => setCurrentScreen('create_account')}
        />
      )}

      {currentScreen === 'create_account' && (
        <CreateAccountPage 
          onCreateAccount={handleCreateAccount}
          onGoogleSignIn={() => setCurrentScreen('classrooms')}
          onSwitchToSignIn={() => setCurrentScreen('signin')} 
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
