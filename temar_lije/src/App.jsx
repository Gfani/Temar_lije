import React, { useState } from 'react';
import Landingpage from './features/landing/landing.jsx';
import SignInPage from './features/auth/signin/signin.jsx';
import CreateAccountPage from './features/auth/create_account/create_account.jsx';
import Classrooms from './features/classrooms/classrooms.jsx';
import ClassroomDetail from './features/classroom-detail/classroom_detail.jsx';

export default function App() {
  // Track active screen: 'landing' | 'signin' | 'create_account' | 'classrooms' | 'classroom_detail'
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [currentUser, setCurrentUser] = useState({
    name: 'Gelila Sintayehu',
    role: 'Student'
  });

  const handleSignIn = (data) => {
    const roleName = data?.role ? (data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()) : 'Student';
    const name = data?.email ? (data.email.split('@')[0]) : 'Gelila Sintayehu';
    setCurrentUser({ name, role: roleName });
    setCurrentScreen('classrooms');
  };

  const handleCreateAccount = (data) => {
    const roleName = data?.role ? (data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()) : 'Student';
    setCurrentUser({ name: data?.fullName || 'Gelila Sintayehu', role: roleName });
    setCurrentScreen('classrooms');
  };

  const handleGoogleSignIn = (role = 'student') => {
    const roleName = role ? (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()) : 'Student';
    setCurrentUser({ name: 'Gelila Sintayehu', role: roleName });
    setCurrentScreen('classrooms');
  };

  return (
    <div>
      {currentScreen === 'landing' && (
        <Landingpage 
          onSignIn={() => setCurrentScreen('signin')} 
          onStartTeaching={() => {
            setCurrentUser((prev) => ({ ...prev, role: 'Teacher' }));
            setCurrentScreen('signin');
          }}
          onJoinClass={() => {
            setCurrentUser((prev) => ({ ...prev, role: 'Student' }));
            setCurrentScreen('signin');
          }}
        />
      )}

      {currentScreen === 'signin' && (
        <SignInPage 
          onSignIn={handleSignIn}
          onGoogleSignIn={handleGoogleSignIn}
          onBackToLanding={() => setCurrentScreen('landing')} 
          onSwitchToCreateAccount={() => setCurrentScreen('create_account')}
        />
      )}

      {currentScreen === 'create_account' && (
        <CreateAccountPage 
          onCreateAccount={handleCreateAccount}
          onGoogleSignIn={handleGoogleSignIn}
          onSwitchToSignIn={() => setCurrentScreen('signin')} 
        />
      )}

      {currentScreen === 'classrooms' && (
        <Classrooms 
          currentUser={currentUser}
          onSelectClassroom={(classroom) => {
            setSelectedClassroom(classroom);
            setCurrentScreen('classroom_detail');
          }}
          onLogout={() => setCurrentScreen('landing')} 
        />
      )}

      {currentScreen === 'classroom_detail' && (
        <ClassroomDetail 
          classroom={selectedClassroom || { title: "Flutter", subject: "Widget · widget structure" }}
          currentUser={currentUser}
          onBackToClassrooms={() => setCurrentScreen('classrooms')}
          onLogout={() => setCurrentScreen('landing')}
        />
      )}
    </div>
  );
}
