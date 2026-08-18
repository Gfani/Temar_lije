import React, { useState } from 'react';
import Header from '../../components/common/Header/header.jsx';
import ClassroomHeader from '../../components/common/tittle/Tittle.jsx';
import MaterialsTab from './tabs/Material/MaterialsTab.jsx';
import LiveClassTab from './tabs/LiveClassTab/LiveClassTab.jsx';
import AssignmentsTab from './tabs/AssignmentsTab/AssignmentsTab.jsx';
import AttendanceTab from './tabs/Attendance/AttendanceTab.jsx';
import QuizzesTab from './tabs/Quize/QuizzesTab.jsx';
import MembersTab from './tabs/MemberTab/MembersTab.jsx';
import TeacherMemberTab from './tabs/TeacherMemberTab/TeacherMemberTab.jsx';
import StudyBuddy from '../study-buddy/study-buddy.jsx';

export default function ClassroomDetail({
  classroom = { title: "Flutter", subject: "Widget · widget structure" },
  currentUser = { name: "Gelila Sintayehu", role: "Student" },
  onBackToClassrooms,
  onLogout
}) {
  const [currentNavTab, setCurrentNavTab] = useState('classrooms');
  const [activeDetailTab, setActiveDetailTab] = useState('materials');

  const avatarInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'GS';
  const isTeacher = currentUser?.role?.toLowerCase() === 'teacher';

  const handleHeaderTabChange = (tab) => {
    if (tab === 'classrooms' && currentNavTab === 'classrooms') {
      onBackToClassrooms?.();
    } else {
      setCurrentNavTab(tab);
    }
  };

  return (
    <div className="classroom-detail-page" style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Top Header */}
      <Header
        userName={currentUser.name}
        role={currentUser.role}
        userInitials={avatarInitial}
        currentTab={currentNavTab}
        onTabChange={handleHeaderTabChange}
        onLogout={onLogout}
      />

      {currentNavTab === 'study-buddy' ? (
        <main className="classroom-detail-content" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 2rem' }}>
          <StudyBuddy />
        </main>
      ) : (
        <>
          {/* Classroom Title & Navigation Tabs Header */}
          <ClassroomHeader
            title={classroom.title}
            subject={classroom.subject}
            activeTab={activeDetailTab}
            invitationCode={classroom.code || "DB7GLU"}
            isTeacher={isTeacher}
            onTabChange={setActiveDetailTab}
            onBack={onBackToClassrooms}
          />

          {/* Detail Tab Contents */}
          <main className="classroom-detail-content" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 2rem' }}>
            {activeDetailTab === 'materials' && (
              <MaterialsTab classId={classroom.id || '66666666-6666-4666-8666-666666666666'} />
            )}
            {activeDetailTab === 'live-class' && (
              <LiveClassTab
                classId={classroom.id || '66666666-6666-4666-8666-666666666666'}
                studentId={currentUser.id || '33333333-3333-4333-8333-333333333333'}
              />
            )}
            {activeDetailTab === 'assignments' && (
              <AssignmentsTab
                classId={classroom.id || '66666666-6666-4666-8666-666666666666'}
                isTeacher={isTeacher}
                currentUserId={currentUser.id || '33333333-3333-4333-8333-333333333333'}
              />
            )}
            {activeDetailTab === 'attendance' && (
              <AttendanceTab
                classId={classroom.id || '66666666-6666-4666-8666-666666666666'}
                studentId={currentUser.id || '33333333-3333-4333-8333-333333333333'}
              />
            )}
            {activeDetailTab === 'quizzes' && <QuizzesTab />}
            {activeDetailTab === 'members' && (
              isTeacher ? <TeacherMemberTab /> : <MembersTab />
            )}
          </main>
        </>
      )}
    </div>
  );
}
