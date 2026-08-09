import React, { useState } from 'react';
import './topic.css';

const DEFAULT_SUGGESTIONS = [
    'StatefulWidget Lifecycle',
    'Widget Tree & Rebuilds',
    'setState() Deep Dive',
    'BuildContext Explained',
    'Keys in Flutter'
];

function Topic({ isOpen, onClose, userProfiles = {}, invitedMembers = ['at', 'yb'], onCreate }) {
    if (!isOpen) return null;

    const [topicName, setTopicName] = useState('StatefulWidget Lifecycle');

    const handleSuggestionClick = (suggestion) => {
        setTopicName(suggestion);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!topicName.trim()) return;
        if (onCreate) {
            onCreate(topicName.trim());
        }
        onClose();
    };

    // Format list of invited member names for display
    const invitedUserObjs = invitedMembers.map(id => userProfiles[id]).filter(Boolean);
    const invitedNamesText = invitedUserObjs.map(u => u.name.split(' ')[0]).join(', ');

    return (
        <div className="topic-modal-overlay" onClick={onClose}>
            <div className="topic-modal-content" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <h2 className="topic-modal-title">Create Study Topic</h2>
                <p className="topic-modal-subtitle">
                    Name the topic your group will study together.
                </p>

                {/* Avatar Stack & Invited Members Notice */}
                <div className="topic-invited-row">
                    <div className="topic-avatar-stack">
                        {invitedUserObjs.slice(0, 3).map((user, idx) => (
                            <div
                                key={idx}
                                className="topic-avatar-circle"
                                style={{ backgroundColor: user.avatarBg || '#8b5cf6', zIndex: 10 - idx }}
                            >
                                {user.initials}
                            </div>
                        ))}
                    </div>
                    <span className="topic-invited-text">
                        {invitedNamesText ? `${invitedNamesText} will be invited` : 'Group members will be invited'}
                    </span>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Topic Name Input */}
                    <div className="topic-form-group">
                        <label className="topic-input-label">Topic Name</label>
                        <input
                            type="text"
                            className="topic-input-field"
                            value={topicName}
                            onChange={(e) => setTopicName(e.target.value)}
                            placeholder="Enter topic name..."
                            autoFocus
                        />
                    </div>

                    {/* Suggestions Section */}
                    <div className="topic-suggestions-section">
                        <span className="topic-suggestions-label">SUGGESTIONS</span>
                        <div className="topic-chips-wrapper">
                            {DEFAULT_SUGGESTIONS.map((suggestion, idx) => {
                                const isSelected = topicName.trim() === suggestion;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        className={`topic-chip ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Modal Action Buttons */}
                    <div className="topic-modal-actions">
                        <button
                            type="button"
                            className="topic-btn-cancel"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="topic-btn-submit"
                        >
                            Next: Review Invitations →
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}

export default Topic;
