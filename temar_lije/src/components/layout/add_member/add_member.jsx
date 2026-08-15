import React, { useState } from 'react';
import { Users, Copy, Check, X } from 'lucide-react';
import './add_member.css';

function AddMember({ isOpen, onClose, groupName, groupIcon, groupColor, inviteLink, onCopy }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

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
                    {groupIcon || <Users size={24} />}
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
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                        {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
                    </button>
                </div>

                {/* Bottom descriptor */}
                <p className="add-member-footer-note">Anyone with this link can join the group</p>

                {/* Close modal button */}
                <button 
                    type="button" 
                    className="add-member-close-btn" 
                    onClick={onClose}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                    <X size={16} /> Close
                </button>

            </div>
        </div>
    );
}

export default AddMember;
