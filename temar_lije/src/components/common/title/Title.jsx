import React from 'react';
import './Title.css';

const Title = ({ title, subtitle, invitationCode, onBack }) => {
  return (
    <div className="course-header-container">
      <div className="course-header-left">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            &larr; Classrooms
          </button>
        )}
        <h1 className="course-title">{title}</h1>
        {subtitle && <p className="course-subtitle">{subtitle}</p>}
      </div>
      
      {invitationCode && (
        <div className="course-header-right">
          <div className="invitation-card">
            <span className="invitation-label">INVITATION CODE</span>
            <span className="invitation-code">{invitationCode}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Title;
