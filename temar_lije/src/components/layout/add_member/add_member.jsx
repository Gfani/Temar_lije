import React, { useState } from 'react';
import './add_member.css';

function AddMember({ isOpen, onClose, groupName, groupIcon, groupColor, inviteLink, onCopy }) {
    if (!isOpen) return null;

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink)
            .then(() => {
                setCopied(true);
                if (onCopy) onCopy();
                setTimeout(() => {
                    setCopied(false);
                }, 2000);
            })
            .catch(() => {
                alert(`Invite Link: ${inviteLink}`);
            });
    };

    return (
        <div className="add-member-modal-overlay">
            <div className="add-member-modal-content">
                
                {/* Large Group Icon / Avatar Box */}
                <div 
                    className="add-member-group-avatar" 
                    style={{ backgroundColor: groupColor || 'var(--active-item-border)' }}
                >
                    {groupIcon || '👥'}
                </div>

                {/* Group Title details */}
                <h3 className="add-member-group-title">{groupName}</h3>
                <p className="add-member-subtitle">Share this link to invite others</p>

                {/* Central Link Box */}
                <div className="add-member-link-box">
                    <label className="add-member-link-label">INVITE LINK</label>
                    <a 
                        href={inviteLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="add-member-link-text"
                        style={{ display: 'block', textDecoration: 'underline', color: '#0d9488' }}
                    >
                        {inviteLink}
                    </a>
                    <button 
                        type="button" 
                        className={`add-member-copy-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>

                {/* Bottom descriptor */}
                <p className="add-member-footer-note">Anyone with this link can join the group</p>

                {/* Close modal button */}
                <button type="button" className="add-member-close-btn" onClick={onClose}>
                    Close
                </button>

            </div>
        </div>
    );
}

export default AddMember;
