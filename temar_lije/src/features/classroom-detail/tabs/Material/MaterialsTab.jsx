import React, { useState } from 'react';
import { Search, Upload, FileText, Download, Eye, BookOpen } from 'lucide-react';
import './MaterialsTab.css';

const DEFAULT_MATERIALS = [
  {
    id: 'mat-1',
    title: 'Introduction to State Management.pdf',
    type: 'PDF Document',
    size: '2.4 MB',
    uploadedBy: 'Instructor',
    date: 'Aug 14, 2026',
  },
  {
    id: 'mat-2',
    title: 'Lecture 3 - Component Lifecycles & Hooks.pptx',
    type: 'Presentation',
    size: '5.1 MB',
    uploadedBy: 'Instructor',
    date: 'Aug 16, 2026',
  },
];

export default function MaterialsTab({ isTeacher = false, currentUser, onUploadMaterial }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleUpload = () => {
    if (!isTeacher) return;
    if (onUploadMaterial) {
      onUploadMaterial();
    } else {
      const fileName = prompt('Enter material title (e.g. Chapter 4 Notes.pdf):');
      if (fileName && fileName.trim()) {
        const newMat = {
          id: `mat-${Date.now()}`,
          title: fileName.trim(),
          type: 'PDF Document',
          size: '1.8 MB',
          uploadedBy: currentUser?.name || 'Instructor',
          date: 'Just now',
        };
        setMaterials((prev) => [newMat, ...prev]);
      }
    }
  };

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="classroom-detail-container">
      {/* Search & Actions Bar */}
      <div className="materials-action-row">
        <div className="materials-search-container">
          <Search className="materials-search-icon" />
          <input
            type="text"
            className="materials-search-input"
            placeholder="Search materials by title..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {isTeacher && (
          <button className="materials-upload-btn" onClick={handleUpload}>
            <Upload className="materials-upload-icon" />
            Upload material
          </button>
        )}
      </div>

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <div className="materials-empty-state-card">
          <BookOpen size={40} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <p className="materials-empty-state-text">
            {isTeacher
              ? 'No materials yet. Upload PDFs, slides, documents or images for this class.'
              : 'No materials uploaded yet. Your teacher will share lesson notes and slides here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'var(--surface-color, #ffffff)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '600' }}>
                    {mat.title}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {mat.type} · {mat.size} · Uploaded {mat.date}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={() => alert(`Opening ${mat.title}...`)}
                >
                  <Eye size={14} /> View
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#14785c',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={() => alert(`Downloading ${mat.title}...`)}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
