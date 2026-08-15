import React, { useState } from 'react';
import { Search, Upload } from 'lucide-react';
import './MaterialsTab.css';

export default function MaterialsTab({ onUploadMaterial }) {
  const [searchQuery, setSearchQuery] = useState('');

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
