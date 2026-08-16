import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './Tittle.module.css';

const TABS = [
  { id: 'materials', label: 'Materials' },
  { id: 'live-class', label: 'Live class' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'members', label: 'Members' },
];

export const ClassroomHeader = ({
  title = "Flutter",
  subject = "Widget · widget structure",
  activeTab = "materials",
  invitationCode = "DB7GLU",
  isTeacher = false,
  onTabChange,
  onBack,
}) => {
  const handleTabClick = (tabId) => {
    if (onTabChange) onTabChange(tabId);
  };

  const formattedCode = invitationCode ? invitationCode.split('').join(' ') : 'D B 7 G L U';

  return (
    <div className={styles.headerContainer}>
      {/* Back button */}
      <button className={styles.backButton} onClick={onBack}>
        <ArrowLeft size={16} className={styles.backIcon} /> Classrooms
      </button>

      {/* Classroom Title and Subtitle Row */}
      <div className={styles.headerTopRow}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subject}</p>
        </div>

        {isTeacher && (
          <div className={styles.invitationBadge}>
            <span className={styles.invitationBadgeLabel}>INVITATION CODE</span>
            <span className={styles.invitationBadgeCode}>{formattedCode}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs Pill Container */}
      <div className={styles.tabsContainer}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${
              activeTab === tab.id ? styles.activeTab : ''
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClassroomHeader;