import React, { useState } from 'react';
import { Search, Upload } from 'lucide-react';
import './MaterialsTab.css';

export default function MaterialsTab({ onUploadMaterial }) {
  const [searchQuery, setSearchQuery] = useState('');
  const tabs = ['Materials', 'Live class', 'Assignments', 'Attendance', 'Quizzes', 'Members'];
  const [activeTab, setActiveTab] = useState('Materials');

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleUpload = () => {
    if (onUploadMaterial) {
      onUploadMaterial();
    } else {
      alert('Upload material clicked!');
    }
  };

  return (
    <div className="classroom-detail-container">
      {/* Tab Navigation */}
      <div className="classroom-tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`classroom-tab-pill ${tab === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search & Actions Bar */}
      <div className="materials-action-row">
        <div className="materials-search-container">
          <Search className="materials-search-icon" />
          <input
            type="text"
            className="materials-search-input"
            placeholder="Search materials"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <button className="materials-upload-btn" onClick={handleUpload}>
          <Upload className="materials-upload-icon" />
          Upload material
        </button>
      </div>

      {/* Empty State Card */}
      <div className="materials-empty-state-card">
        <p className="materials-empty-state-text">
          No materials yet. Upload PDFs, slides, documents or images for this class.
        </p>
      </div>
    </div>
  );
}
