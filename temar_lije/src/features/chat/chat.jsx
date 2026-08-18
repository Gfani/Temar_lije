import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, X, Search, ArrowLeft, Plus, BookOpen, Menu, UserPlus, Link, Check, CheckCheck, Paperclip, Send, Smile, Copy, Pencil, Trash2, Reply, Forward, Info, FileText, Image, FolderArchive, MessageSquare, Phone, Mic, MicOff, Volume2, LogOut, Pin, PinOff, Play, Pause, ChevronUp, ChevronDown } from 'lucide-react';
import './chat.css';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../config/constants';
import CreateGroup from '../../components/layout/create_group/create_group';
import AddMember from '../../components/layout/add_member/add_member';
import Topic from '../../components/layout/topic/topic';
import SendInvitation from '../../components/layout/send_invitation/send_invitation';
import StudyInvitation from '../../components/layout/study_invitation/study_invitation';

const CURATED_EMOJIS = ['😄', '😂', '👍', '❤️', '🔥', '💪', '✅', '🎨', '💻', '🚀', '📚', '📝', '💡', '👑', '🌟', '👏', '🎉', '👋'];

const USER_PROFILES = {
    'gs': { name: 'Gelila Sintayehu', initials: 'GS', avatarBg: '#3b82f6', online: true },
    'at': { name: 'Fanuel Goitom', initials: 'FG', avatarBg: '#8b5cf6', online: true },
    'yb': { name: 'Yonas Bekele', initials: 'YB', avatarBg: '#0d9488', online: true },
    'mh': { name: 'Meron Haile', initials: 'MH', avatarBg: '#f97316', online: false },
    'ta': { name: 'Tigist Alemu', initials: 'TA', avatarBg: '#a855f7', online: true }
};

function Chat({
    hideSidebar = false,
    activeId: propActiveId,
    setActiveId: propSetActiveId,
    showCreateGroupDirectly = false,
    onCloseCreateGroupDirectly,
    studyGroups: propStudyGroups,
    setStudyGroups: propSetStudyGroups,
    darkMode: propDarkMode,
    setDarkMode: propSetDarkMode
}) {
    const [localDarkMode, setLocalDarkMode] = useState(false);
    const darkMode = propDarkMode !== undefined ? propDarkMode : localDarkMode;
    const setDarkMode = propSetDarkMode !== undefined ? propSetDarkMode : setLocalDarkMode;
    const [searchQuery, setSearchQuery] = useState('');

    const [localActiveId, setLocalActiveId] = useState('widget-kings');
    const activeId = propActiveId !== undefined ? propActiveId : localActiveId;
    const setActiveId = propSetActiveId !== undefined ? propSetActiveId : setLocalActiveId;

    const [inputValue, setInputValue] = useState('');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // In-Chat Message Search States
    const [showInChatSearch, setShowInChatSearch] = useState(false);
    const [inChatSearchQuery, setInChatSearchQuery] = useState('');
    const [searchMatchIndex, setSearchMatchIndex] = useState(0);

    // Audio Voice Note Recording States
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [activeAudioPlayingId, setActiveAudioPlayingId] = useState(null);
    const [activeAudioProgress, setActiveAudioProgress] = useState({});
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const audioPlayerRefs = useRef({});

    // Voice Chat Real Microphone Stream
    const voiceAudioContextRef = useRef(null);
    const voiceStreamRef = useRef(null);
    const voiceAnalyserRef = useRef(null);
    const [localIsSpeaking, setLocalIsSpeaking] = useState(false);

    // Rich Interactive States
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachedImage, setAttachedImage] = useState(null);
    const [showAddModal, setShowAddModal] = useState({ open: false, type: 'group' });
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [typingUser, setTypingUser] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, message: null });
    const [replyingTo, setReplyingTo] = useState(null);
    const [forwardingMessage, setForwardingMessage] = useState(null);
    const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [joinPreviewGroupId, setJoinPreviewGroupId] = useState(null);
    const [joinRequestState, setJoinRequestState] = useState(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [showUploadOptionModal, setShowUploadOptionModal] = useState(false);
    const [showCreateTopicModal, setShowCreateTopicModal] = useState(false);
    const [showSendInvitationModal, setShowSendInvitationModal] = useState(false);
    const [showStudyInvitationModal, setShowStudyInvitationModal] = useState(false);
    const [createdTopicName, setCreatedTopicName] = useState('StatefulWidget Lifecycle');
    const [activeTopicId, setActiveTopicId] = useState('general');
    const [selectedGroupIdForTopics, setSelectedGroupIdForTopics] = useState(null);

    const [invitationData, setInvitationData] = useState({
        isOpen: false,
        inviterName: '',
        inviterInitials: '',
        topicName: '',
        categoryName: '',
        groupId: ''
    });

    const [groupMemberRoles, setGroupMemberRoles] = useState({});

    const handleToggleAdminRole = (memberId) => {
        const currentRole = groupMemberRoles[`${activeId}-${memberId}`] || 'MEMBER';
        const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
        
        fetch(`${API_BASE_URL}/chat/groups/${activeId}/members/${memberId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        })
        .then(res => {
            if (res.ok) {
                setGroupMemberRoles(prev => ({
                    ...prev,
                    [`${activeId}-${memberId}`]: newRole
                }));
                if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                setToastMessage(`${USER_PROFILES[memberId]?.name} is now a ${newRole.toLowerCase()}!`);
                toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
            }
        })
        .catch(err => console.error('Failed to update member role:', err));
    };

    const simSpeakerIntervalRef = useRef(null);

    const startVoiceAudioCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceStreamRef.current = stream;
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (AudioCtxClass) {
                const audioCtx = new AudioCtxClass();
                voiceAudioContextRef.current = audioCtx;
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                voiceAnalyserRef.current = analyser;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const checkAudioLevel = () => {
                    if (!voiceAnalyserRef.current) return;
                    voiceAnalyserRef.current.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    const avg = sum / dataArray.length;
                    setLocalIsSpeaking(avg > 16);
                    requestAnimationFrame(checkAudioLevel);
                };
                requestAnimationFrame(checkAudioLevel);
            }
        } catch (err) {
            console.warn('Voice chat mic access:', err);
        }
    };

    const stopVoiceAudioCapture = () => {
        if (voiceStreamRef.current) {
            voiceStreamRef.current.getTracks().forEach(track => track.stop());
            voiceStreamRef.current = null;
        }
        if (voiceAudioContextRef.current) {
            voiceAudioContextRef.current.close().catch(() => {});
            voiceAudioContextRef.current = null;
        }
        voiceAnalyserRef.current = null;
        setLocalIsSpeaking(false);
    };

    const handleToggleVoiceChat = () => {
        if (voiceCallStatus === 'connected') {
            return;
        }

        setVoiceCallStatus('connecting');
        startVoiceAudioCapture();

        setTimeout(() => {
            setVoiceCallStatus('connected');
            setLocalMuted(false);

            const initialChat = {
                groupId: activeId,
                participants: [
                    { userId: 'gs', username: 'Gelila Sintayehu', initials: 'GS', avatarBg: '#3b82f6', muted: false, speaking: false }
                ]
            };
            setActiveVoiceChat(initialChat);

            if (socketRef.current) {
                socketRef.current.emit('joinVoiceChat', {
                    groupId: activeId,
                    userId: 'gs',
                    username: 'Gelila Sintayehu',
                    initials: 'GS',
                    avatarBg: '#3b82f6'
                });
            }

            // Simulate peer users joining the call to showcase real-time voice chat indicators
            setTimeout(() => {
                const userAT = USER_PROFILES['at'];
                if (socketRef.current) {
                    socketRef.current.emit('joinVoiceChat', {
                        groupId: activeId,
                        userId: 'at',
                        username: userAT.name,
                        initials: userAT.initials,
                        avatarBg: userAT.avatarBg
                    });
                }
            }, 1500);

            setTimeout(() => {
                const userYB = USER_PROFILES['yb'];
                if (socketRef.current) {
                    socketRef.current.emit('joinVoiceChat', {
                        groupId: activeId,
                        userId: 'yb',
                        username: userYB.name,
                        initials: userYB.initials,
                        avatarBg: userYB.avatarBg
                    });
                }
            }, 3000);

            // Periodically refresh participant speaking states
            simSpeakerIntervalRef.current = setInterval(() => {
                setActiveVoiceChat(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        participants: prev.participants.map(p => {
                            if (p.userId === 'gs') {
                                return { ...p, speaking: !localMuted && (localIsSpeaking || Math.random() > 0.7) };
                            }
                            return { ...p, speaking: !p.muted && Math.random() > 0.5 };
                        })
                    };
                });
            }, 800);

        }, 800);
    };

    const handleLeaveVoiceChat = () => {
        stopVoiceAudioCapture();
        if (simSpeakerIntervalRef.current) {
            clearInterval(simSpeakerIntervalRef.current);
            simSpeakerIntervalRef.current = null;
        }

        if (socketRef.current && activeVoiceChat) {
            socketRef.current.emit('leaveVoiceChat', {
                groupId: activeVoiceChat.groupId,
                userId: 'gs'
            });
        }

        setVoiceCallStatus(null);
        setActiveVoiceChat(null);
    };

    const handleToggleLocalMute = () => {
        const nextMuted = !localMuted;
        setLocalMuted(nextMuted);

        if (voiceStreamRef.current) {
            voiceStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !nextMuted;
            });
        }

        if (socketRef.current && activeVoiceChat) {
            socketRef.current.emit('toggleMuteVoice', {
                groupId: activeVoiceChat.groupId,
                userId: 'gs',
                muted: nextMuted
            });
        }
    };

    const [activeVoiceChat, setActiveVoiceChat] = useState(null); 
    const [localMuted, setLocalMuted] = useState(false);
    const [voiceCallStatus, setVoiceCallStatus] = useState(null);

    // Audio Voice Note Recording Handlers
    const handleStartVoiceRecording = async () => {
        try {
            let stream = null;
            const isVoiceChatActive = voiceStreamRef.current && voiceCallStatus === 'connected';

            if (isVoiceChatActive) {
                stream = voiceStreamRef.current;
            } else {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            }

            audioChunksRef.current = [];

            let options = { audioBitsPerSecond: 128000 };
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options.mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                options.mimeType = 'audio/webm';
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(1000); // Flush buffer chunks every second for reliability
            setIsRecordingVoice(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start audio recording:', err);
            alert('Microphone access is required to record voice notes.');
        }
    };

    const handleCancelVoiceRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            const isSharedStream = voiceStreamRef.current && voiceCallStatus === 'connected';
            if (!isSharedStream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            mediaRecorderRef.current.stop();
        }
        clearInterval(recordingTimerRef.current);
        setIsRecordingVoice(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
    };

    const handleSendVoiceRecording = async () => {
        if (!mediaRecorderRef.current || !isRecordingVoice) return;
        const duration = recordingDuration;
        clearInterval(recordingTimerRef.current);
        setIsRecordingVoice(false);
        setRecordingDuration(0);

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const isSharedStream = voiceStreamRef.current && voiceCallStatus === 'connected';
            if (!isSharedStream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }

            const formData = new FormData();
            formData.append('file', audioBlob, `voice-note-${Date.now()}.webm`);

            let audioUrl = '';
            try {
                const res = await fetch(`${API_BASE_URL}/chat/upload`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                audioUrl = data.url;
            } catch (err) {
                console.error('Failed to upload voice note:', err);
                audioUrl = URL.createObjectURL(audioBlob);
            }

            const isClassroom = classrooms.some(c => c.id === activeId);
            const roomId = isClassroom ? activeId : `${activeId}-${activeTopicId}`;
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const newMsg = {
                id: `optimistic-voice-${Date.now()}`,
                senderId: 'gs',
                sender: 'Gelila Sintayehu',
                initials: 'GS',
                avatarClass: 'gs',
                time: timeString,
                incoming: false,
                type: 'audio',
                audioUrl: audioUrl,
                text: audioUrl,
                fileName: `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
                fileSize: formatBytes(audioBlob.size),
                fileIcon: '🎙️',
                duration: duration,
                isPinned: false
            };

            setMessagesByGroup(prev => ({
                ...prev,
                [roomId]: [...(prev[roomId] || []), newMsg]
            }));

            if (socketRef.current) {
                socketRef.current.emit('sendMessage', {
                    roomId,
                    senderId: 'gs',
                    text: audioUrl,
                    type: 'audio',
                    fileName: newMsg.fileName,
                    fileSize: newMsg.fileSize,
                    fileIcon: '🎙️'
                });
            }
        };

        mediaRecorderRef.current.stop();
    };

    // Toggle Pin Message Handler
    const handleTogglePinMessage = (msg) => {
        if (!msg) return;
        const newPinned = !msg.isPinned;
        fetch(`${API_BASE_URL}/chat/messages/${msg.id}/pin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPinned: newPinned })
        })
        .then(res => res.json())
        .then(() => {
            setMessagesByGroup(prev => {
                const isClassroom = classrooms.some(c => c.id === activeId);
                const currentKey = isClassroom ? activeId : `${activeId}-${activeTopicId}`;
                const current = prev[currentKey] || [];
                return {
                    ...prev,
                    [currentKey]: current.map(m => (m.id === msg.id ? { ...m, isPinned: newPinned } : m))
                };
            });
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            setToastMessage(newPinned ? 'Message pinned to top!' : 'Message unpinned');
            toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2500);
        })
        .catch(err => console.error('Failed to pin message:', err));
    };

    // Smooth Scroll Jump to Message
    const handleJumpToMessage = (msgId) => {
        const elem = document.getElementById(`msg-bubble-${msgId}`);
        if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elem.classList.remove('msg-highlight-flash');
            void elem.offsetWidth;
            elem.classList.add('msg-highlight-flash');
            setTimeout(() => elem.classList.remove('msg-highlight-flash'), 2600);
        }
    };

    // Mock list of Classrooms
    const [classrooms, setClassrooms] = useState([
        { id: 'flutter', name: 'Flutter', subtitle: 'Samuel: Post your lifecycle qu...', isClassroom: true, time: '1:56 PM' },
        { id: 'react-native', name: 'React Native', subtitle: 'Mobile development', isClassroom: true, time: '' }
    ]);

    // Study Groups
    const [localStudyGroups, setLocalStudyGroups] = useState([
        { id: 'widget-kings', name: 'Widget Kings 👑', subtitle: 'Abebe: Deadline Sunday midni...', isClassroom: false, time: '2:54 PM', members: ['gs', 'at', 'yb'], icon: '🦋', color: '#6366f1' },
        { id: 'vd', name: 'vd', subtitle: 'No messages yet', isClassroom: false, time: '', members: ['gs'], icon: '💻', color: '#0d9488' },
        { id: 'packages', name: 'packages', subtitle: 'No messages yet', isClassroom: false, time: '', members: ['gs'], icon: '📚', color: '#06b6d4' }
    ]);
    const studyGroups = propStudyGroups !== undefined ? propStudyGroups : localStudyGroups;
    const setStudyGroups = propSetStudyGroups !== undefined ? propSetStudyGroups : setLocalStudyGroups;

    // Messages log by group/classroom ID
    const [messagesByGroup, setMessagesByGroup] = useState({});

    // Refs
    const socketRef = useRef(null);
    const studyGroupsRef = useRef(studyGroups);

    // Keep studyGroupsRef in sync with studyGroups
    useEffect(() => {
        studyGroupsRef.current = studyGroups;
    }, [studyGroups]);

    const [topicsByGroup, setTopicsByGroup] = useState({
        'widget-kings': [
            { id: 'general', name: 'General', icon: '#', color: '#64748b', subtitle: 'You: Perfect, that leaves me UI patch and...', time: 'Mon' },
            { id: 'project', name: 'Project', icon: 'P', color: '#ef4444', subtitle: 'Lala G: In addition to this next to the .jsx file...', time: '9:18 PM' },
            { id: 'profile', name: 'profile', icon: 'p', color: '#f97316', subtitle: 'Fikrte: Fikrte Gebretsadkan CTC-5776-26', time: 'Fri' },
            { id: 'resources', name: 'Resources', icon: 'R', color: '#10b981', subtitle: 'Lala G: Here is flutte11e ppt', time: 'Thu' },
            { id: 'tools', name: 'Tools', icon: 'T', color: '#84cc16', subtitle: 'Lala G: this is base 44, used to give you...', time: 'Tue' },
            { id: 'daily-challenges', name: 'Daily challenges', icon: 'D', color: '#be185d', subtitle: 'Fikrte: 📷 Photo', time: '8/1/2026' }
        ],
        'vd': [
            { id: 'general', name: 'General', icon: '#', color: '#64748b', subtitle: 'No messages yet', time: '' }
        ],
        'packages': [
            { id: 'general', name: 'General', icon: '#', color: '#64748b', subtitle: 'No messages yet', time: '' }
        ]
    });

    // Initialize socket connection and load groups
    useEffect(() => {
        socketRef.current = io(API_BASE_URL);

        socketRef.current.on('newMessage', (msg) => {
            const mappedMsg = {
                id: msg.id,
                sender: msg.senderId === 'gs' ? 'Gelila Sintayehu' : (msg.sender?.name || msg.senderId),
                initials: msg.senderId === 'gs' ? 'GS' : (msg.sender?.initials || '??'),
                avatarClass: msg.senderId === 'gs' ? 'gs' : 'at',
                avatarBg: msg.sender?.avatarBg || '#8b5cf6',
                text: msg.text,
                image: msg.image,
                time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                incoming: msg.senderId !== 'gs',
                reactions: [],
                type: msg.type,
                fileName: msg.fileName,
                fileSize: msg.fileSize,
                fileIcon: msg.fileIcon,
                isPinned: msg.isPinned || false,
                audioUrl: msg.type === 'audio' ? (msg.audioUrl || msg.text) : undefined,
                replyTo: msg.replyTo || undefined
            };

            setMessagesByGroup(prev => {
                const key = msg.groupId;
                const existing = prev[key] || [];
                // If we already have this server-confirmed id, skip
                if (existing.some(m => m.id === msg.id)) return prev;
                // Replace optimistic placeholder if sender is 'gs'
                if (msg.senderId === 'gs') {
                    const optimisticIdx = existing.findIndex(m => m.id && m.id.startsWith('optimistic-'));
                    if (optimisticIdx !== -1) {
                        const updated = [...existing];
                        updated[optimisticIdx] = mappedMsg;
                        return { ...prev, [key]: updated };
                    }
                }
                return {
                    ...prev,
                    [key]: [...existing, mappedMsg]
                };
            });

            const previewText = msg.type === 'audio' ? '🎙️ Voice note' : (msg.text || (msg.image ? '📷 Photo' : 'Attachment'));
            const senderName = msg.senderId === 'gs' ? 'You' : (msg.sender?.name || msg.senderId);
            // Find parent group using prefix matching (safe for UUID IDs)
            const parentGroup = studyGroupsRef.current.find(g => msg.groupId === g.id || msg.groupId.startsWith(g.id + '-'));
            if (parentGroup) {
                setStudyGroups(prev =>
                    prev.map(g => (g.id === parentGroup.id ? { ...g, subtitle: `${senderName}: ${previewText}`, time: mappedMsg.time } : g))
                );
            }
        });

        socketRef.current.on('messagePinned', (data) => {
            const { messageId, isPinned } = data;
            setMessagesByGroup(prev => {
                const updatedAll = {};
                Object.keys(prev).forEach(key => {
                    updatedAll[key] = (prev[key] || []).map(m => (m.id === messageId ? { ...m, isPinned } : m));
                });
                return updatedAll;
            });
        });

        socketRef.current.on('groupDeleted', (data) => {
            const { groupId } = data;
            const parent = studyGroupsRef.current.find(m => groupId.startsWith(`${m.id}-`));
            if (parent) {
                const topicId = groupId.substring(parent.id.length + 1);
                setTopicsByGroup(prev => {
                    const existing = prev[parent.id] || [];
                    const filtered = existing.filter(t => t.id !== topicId);
                    return {
                        ...prev,
                        [parent.id]: filtered
                    };
                });
                setActiveTopicId(prev => (prev === topicId ? 'general' : prev));
            } else {
                setStudyGroups(prev => prev.filter(g => g.id !== groupId));
                setActiveId(prev => (prev === groupId ? 'flutter' : prev));
            }
        });

        socketRef.current.on('groupCreated', (group) => {
            const parent = studyGroupsRef.current.find(m => group.id.startsWith(`${m.id}-`));
            if (parent) {
                const topicId = group.id.substring(parent.id.length + 1);
                setTopicsByGroup(prev => {
                    const existing = prev[parent.id] || [];
                    if (existing.some(t => t.id === topicId)) return prev;
                    return {
                        ...prev,
                        [parent.id]: [
                            ...existing,
                            { id: topicId, name: group.name, icon: group.icon || '#', color: group.color || '#0d9488', subtitle: group.description || 'Topic created', time: '' }
                        ]
                    };
                });
            } else {
                setStudyGroups(prev => {
                    if (prev.some(g => g.id === group.id)) return prev;
                    return [
                        ...prev,
                        {
                            id: group.id,
                            name: group.name,
                            subtitle: group.description || 'No messages yet',
                            isClassroom: false,
                            time: '',
                            icon: group.icon || '👥',
                            color: group.color || '#8b5cf6',
                            members: group.members?.map(m => m.userId) || []
                        }
                    ];
                });
            }
        });

        socketRef.current.on('memberRemoved', (data) => {
            const { groupId, userId } = data;
            if (userId === 'gs') {
                if (activeId === groupId) {
                    setActiveId('flutter');
                }
                setStudyGroups(prev => prev.filter(g => g.id !== groupId));
                if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                setToastMessage(`You were removed from the group.`);
                toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
            } else {
                setStudyGroups(prev =>
                    prev.map(g => {
                        if (g.id === groupId) {
                            return {
                                ...g,
                                members: (g.members || []).filter(m => m !== userId)
                            };
                        }
                        return g;
                    })
                );
            }
        });

        socketRef.current.on('studyInvitation', (data) => {
            if (data.invitedMembers.includes('gs') && data.inviterId !== 'gs') {
                setInvitationData({
                    isOpen: true,
                    inviterName: data.inviterName,
                    inviterInitials: data.inviterInitials,
                    topicName: data.topicName,
                    categoryName: data.categoryName,
                    groupId: data.groupId
                });
            }
        });

        socketRef.current.on('roleUpdated', (data) => {
            const { groupId, userId, role } = data;
            setGroupMemberRoles(prev => ({
                ...prev,
                [`${groupId}-${userId}`]: role
            }));
        });

        socketRef.current.on('voiceChatUserJoined', (data) => {
            const { groupId, userId, username, initials, avatarBg } = data;
            setActiveVoiceChat(prev => {
                const currentParticipants = prev?.groupId === groupId ? prev.participants : [];
                if (currentParticipants.some(p => p.userId === userId)) return prev;
                return {
                    groupId,
                    participants: [
                        ...currentParticipants,
                        { userId, username, initials, avatarBg, muted: false, speaking: false }
                    ]
                };
            });
        });

        socketRef.current.on('voiceChatUserLeft', (data) => {
            const { groupId, userId } = data;
            setActiveVoiceChat(prev => {
                if (!prev || prev.groupId !== groupId) return prev;
                const updatedParticipants = prev.participants.filter(p => p.userId !== userId);
                if (updatedParticipants.length === 0) return null;
                return {
                    ...prev,
                    participants: updatedParticipants
                };
            });
        });

        socketRef.current.on('voiceChatUserMuteToggled', (data) => {
            const { groupId, userId, muted } = data;
            setActiveVoiceChat(prev => {
                if (!prev || prev.groupId !== groupId) return prev;
                return {
                    ...prev,
                    participants: prev.participants.map(p =>
                        p.userId === userId ? { ...p, muted } : p
                    )
                };
            });
        });

        // Fetch persisted study groups
        fetch(`${API_BASE_URL}/chat/groups`)
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data)) {
                    const mainGroups = data.filter(g => {
                        const isTopic = data.some(other => other.id !== g.id && g.id.startsWith(`${other.id}-`));
                        return !isTopic;
                    });
                    const subGroups = data.filter(g => {
                        const isTopic = data.some(other => other.id !== g.id && g.id.startsWith(`${other.id}-`));
                        return isTopic;
                    });

                    const mappedGroups = mainGroups.map(g => ({
                        id: g.id,
                        name: g.name,
                        subtitle: g.description || 'No messages yet',
                        isClassroom: false,
                        time: '',
                        icon: g.icon || '👥',
                        color: g.color || '#8b5cf6',
                        members: g.members?.map(m => m.userId) || []
                    }));
                    
                    const rolesMap = {};
                    data.forEach(g => {
                        g.members?.forEach(m => {
                            rolesMap[`${g.id}-${m.userId}`] = m.role || 'MEMBER';
                        });
                    });
                    setGroupMemberRoles(prev => ({ ...prev, ...rolesMap }));

                    // Build topics map dynamically
                    const tempTopicsByGroup = {};
                    mainGroups.forEach(g => {
                        tempTopicsByGroup[g.id] = [
                            { id: 'general', name: 'General', icon: '#', color: '#64748b', subtitle: 'General chat room', time: '' }
                        ];
                    });

                    subGroups.forEach(sub => {
                        const parent = mainGroups.find(m => sub.id.startsWith(`${m.id}-`));
                        if (parent) {
                            const topicId = sub.id.substring(parent.id.length + 1);
                            if (tempTopicsByGroup[parent.id]) {
                                if (topicId !== 'general') {
                                    if (!tempTopicsByGroup[parent.id].some(t => t.id === topicId)) {
                                        tempTopicsByGroup[parent.id].push({
                                            id: topicId,
                                            name: sub.name,
                                            icon: sub.icon || '#',
                                            color: sub.color || '#64748b',
                                            subtitle: sub.description || 'No messages yet',
                                            time: ''
                                        });
                                    }
                                }
                            }
                        }
                    });

                    setTopicsByGroup(tempTopicsByGroup);
                    setStudyGroups(mappedGroups);
                }
            })
            .catch(err => console.error('Failed to load study groups:', err));

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (simSpeakerIntervalRef.current) clearInterval(simSpeakerIntervalRef.current);
        };
    }, []);

    // Room connection and chat history loading hook
    useEffect(() => {
        if (!activeId || !socketRef.current) return;

        const isClassroom = classrooms.some(c => c.id === activeId);
        const roomId = isClassroom ? activeId : `${activeId}-${activeTopicId}`;

        socketRef.current.emit('joinRoom', {
            roomId: roomId,
            userId: 'gs',
            username: 'Gelila Sintayehu',
            initials: 'GS',
            avatarBg: '#3b82f6'
        });

        fetch(`${API_BASE_URL}/chat/history/${roomId}`)
            .then(res => res.json())
            .then(data => {
                if (data && Array.isArray(data)) {
                    const mappedMessages = data.map(msg => ({
                        id: msg.id,
                        sender: msg.senderId === 'gs' ? 'Gelila Sintayehu' : (msg.sender?.name || msg.senderId),
                        initials: msg.senderId === 'gs' ? 'GS' : (msg.sender?.initials || '??'),
                        avatarClass: msg.senderId === 'gs' ? 'gs' : 'at',
                        avatarBg: msg.sender?.avatarBg || '#8b5cf6',
                        text: msg.text,
                        image: msg.image,
                        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        incoming: msg.senderId !== 'gs',
                        reactions: [],
                        type: msg.type,
                        fileName: msg.fileName,
                        fileSize: msg.fileSize,
                        fileIcon: msg.fileIcon,
                        isPinned: msg.isPinned || false,
                        audioUrl: msg.type === 'audio' ? (msg.audioUrl || msg.text) : undefined,
                        replyTo: msg.replyTo || undefined
                    }));
                    
                    setMessagesByGroup(prev => ({
                        ...prev,
                        [roomId]: mappedMessages
                    }));
                }
            })
            .catch(err => console.error('Failed to load chat history:', err));
    }, [activeId, activeTopicId]);

    // Refs
    const conversationPaneRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevActiveIdRef = useRef(activeId);
    const toastTimeoutRef = useRef(null);

    // Active item and active messages key helpers
    const activeItem =
        studyGroups.find(g => g.id === activeId) ||
        classrooms.find(c => c.id === activeId) ||
        { name: 'Select Conversation', subtitle: '' };

    const activeMessagesKey = activeItem.isClassroom ? activeId : `${activeId}-${activeTopicId}`;
    const activeMessages = messagesByGroup[activeMessagesKey] || messagesByGroup[activeId] || [];

    const pinnedMessage = activeMessages.find(m => m.isPinned);

    const matchedMessageIds = inChatSearchQuery.trim()
        ? activeMessages.filter(m => (m.text || '').toLowerCase().includes(inChatSearchQuery.toLowerCase())).map(m => m.id)
        : [];

    const handleNextSearchMatch = () => {
        if (matchedMessageIds.length === 0) return;
        const nextIdx = (searchMatchIndex + 1) % matchedMessageIds.length;
        setSearchMatchIndex(nextIdx);
        handleJumpToMessage(matchedMessageIds[nextIdx]);
    };

    const handlePrevSearchMatch = () => {
        if (matchedMessageIds.length === 0) return;
        const prevIdx = (searchMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
        setSearchMatchIndex(prevIdx);
        handleJumpToMessage(matchedMessageIds[prevIdx]);
    };

    // Scroll to bottom when active chat changes or a new message is appended
    useEffect(() => {
        if (conversationPaneRef.current) {
            const isChannelSwitch = prevActiveIdRef.current !== activeId;
            conversationPaneRef.current.scrollTo({
                top: conversationPaneRef.current.scrollHeight,
                behavior: isChannelSwitch ? 'auto' : 'smooth'
            });
        }
        prevActiveIdRef.current = activeId;
    }, [activeId, activeTopicId, (messagesByGroup[`${activeId}-${activeTopicId}`] || messagesByGroup[activeId] || []).length]);

    // Typing indicator simulation when active group changes
    useEffect(() => {
        setTypingUser(null);
        if (activeId === 'widget-kings') {
            const timer = setTimeout(() => {
                setTypingUser('Yonas Bekele');
            }, 1000);
            const clearTimer = setTimeout(() => {
                setTypingUser(null);
            }, 3500);
            return () => {
                clearTimeout(timer);
                clearTimeout(clearTimer);
            };
        } else if (activeId === 'flutter') {
            const timer = setTimeout(() => {
                setTypingUser('Samuel');
            }, 800);
            const clearTimer = setTimeout(() => {
                setTypingUser(null);
            }, 3300);
            return () => {
                clearTimeout(timer);
                clearTimeout(clearTimer);
            };
        }
    }, [activeId]);

    // Close custom context menu on outside click
    useEffect(() => {
        const handleOutsideClick = () => {
            if (contextMenu.visible) {
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, [contextMenu.visible]);

    // Handle group creation launch triggered externally
    useEffect(() => {
        if (showCreateGroupDirectly) {
            setShowAddModal({ open: true, type: 'group' });
        }
    }, [showCreateGroupDirectly]);

    // Helper to format bytes
    const formatBytes = (bytes, decimals = 1) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Helper to extract audio duration from file name
    const getAudioDurationFromFileName = (fileName) => {
        if (!fileName) return 0;
        const match = fileName.match(/\((\d+):(\d+)\)/);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            return minutes * 60 + seconds;
        }
        return 0;
    };

    // Helper to format audio playback time
    const formatAudioTime = (seconds) => {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper to get file icon
    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        if (['pdf'].includes(ext)) return '📕';
        if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '📦';
        if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return '🖼️';
        if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
        if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return '🎥';
        if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return '📄';
        return '📁';
    };

    // Handle multiple file input selection
    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        if (selected.length > 0) {
            setPendingFiles(selected);
            setShowUploadOptionModal(true);
        }
        e.target.value = ''; // Reset to allow re-uploading same files
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    // Handle sending the files based on selected Telegram mode
    const handleSendPendingFiles = async (sendMode) => {
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const roomId = activeItem.isClassroom ? activeId : `${activeId}-${activeTopicId}`;

        if (sendMode === 'grouped') {
            const promises = pendingFiles.map(async (file) => {
                const isImage = file.type.startsWith('image/');
                const formData = new FormData();
                formData.append('file', file);
                let fileUrl = null;
                try {
                    const res = await fetch(`${API_BASE_URL}/chat/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    fileUrl = data.url;
                } catch (err) {
                    console.warn('Fallback local file read:', err);
                }

                if (!fileUrl && isImage) {
                    fileUrl = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });
                }

                return {
                    name: file.name,
                    size: formatBytes(file.size),
                    icon: getFileIcon(file.name),
                    data: fileUrl,
                    isImage: isImage
                };
            });

            const groupedItems = await Promise.all(promises);
            const newMessage = {
                id: `msg-group-${Date.now()}`,
                sender: 'Gelila Sintayehu',
                initials: 'GS',
                avatarClass: 'gs',
                type: 'grouped',
                files: groupedItems,
                time: timeString,
                incoming: false,
                reactions: [],
                isPinned: false
            };

            setMessagesByGroup(prev => ({
                ...prev,
                [activeMessagesKey]: [...(prev[activeMessagesKey] || []), newMessage]
            }));

            const previewText = `sent ${pendingFiles.length} grouped files`;
            if (studyGroups.some(g => g.id === activeId)) {
                setStudyGroups(prev =>
                    prev.map(g => (g.id === activeId ? { ...g, subtitle: `You: ${previewText}`, time: timeString } : g))
                );
            }

            if (socketRef.current) {
                socketRef.current.emit('sendMessage', {
                    roomId,
                    senderId: 'gs',
                    text: previewText,
                    type: 'grouped',
                    fileName: `${pendingFiles.length} files`
                });
            }

        } else {
            for (let index = 0; index < pendingFiles.length; index++) {
                const file = pendingFiles[index];
                const isImage = file.type.startsWith('image/');
                const formData = new FormData();
                formData.append('file', file);

                let serverUrl = null;
                try {
                    const res = await fetch(`${API_BASE_URL}/chat/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    serverUrl = data.url;
                } catch (err) {
                    console.warn('Fallback file upload:', err);
                }

                if (!serverUrl && isImage) {
                    serverUrl = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });
                }

                const newMessage = {
                    id: `optimistic-file-${Date.now()}-${index}`,
                    sender: 'Gelila Sintayehu',
                    initials: 'GS',
                    avatarClass: 'gs',
                    time: timeString,
                    incoming: false,
                    reactions: [],
                    isPinned: false
                };

                if (isImage && sendMode === 'compressed') {
                    newMessage.image = serverUrl;
                    newMessage.text = '';
                } else {
                    newMessage.type = 'document';
                    newMessage.fileName = file.name;
                    newMessage.fileSize = formatBytes(file.size);
                    newMessage.fileIcon = getFileIcon(file.name);
                    newMessage.fileDataUrl = serverUrl;
                }

                setMessagesByGroup(prev => ({
                    ...prev,
                    [activeMessagesKey]: [...(prev[activeMessagesKey] || []), newMessage]
                }));

                const previewText = newMessage.image ? '📷 Image attachment' : `📄 ${file.name}`;
                if (studyGroups.some(g => g.id === activeId)) {
                    setStudyGroups(prev =>
                        prev.map(g => (g.id === activeId ? { ...g, subtitle: `You: ${previewText}`, time: timeString } : g))
                    );
                }

                if (socketRef.current) {
                    socketRef.current.emit('sendMessage', {
                        roomId,
                        senderId: 'gs',
                        text: newMessage.text || '',
                        image: newMessage.image || undefined,
                        type: newMessage.type || 'text',
                        fileName: newMessage.fileName,
                        fileSize: newMessage.fileSize,
                        fileIcon: newMessage.fileIcon
                    });
                }
            }
        }

        setShowUploadOptionModal(false);
        setPendingFiles([]);
    };

    // Handle sending or updating a message
    const handleSendMessage = () => {
        if (!inputValue.trim() && !attachedImage) return;

        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (editingMessageId) {
            // Edit existing message in-place
            setMessagesByGroup(prev => {
                const activeMessages = prev[activeMessagesKey] || [];
                const updatedMessages = activeMessages.map(msg => {
                    if (msg.id === editingMessageId) {
                        return {
                            ...msg,
                            text: inputValue,
                            image: attachedImage ? attachedImage : msg.image
                        };
                    }
                    return msg;
                });
                return {
                    ...prev,
                    [activeMessagesKey]: updatedMessages
                };
            });

            // Update preview text in the sidebar
            const previewText = attachedImage ? '📷 Image attachment' : inputValue;
            if (studyGroups.some(g => g.id === activeId)) {
                setStudyGroups(prev =>
                    prev.map(g => (g.id === activeId ? { ...g, subtitle: `You (edited): ${previewText}`, time: timeString } : g))
                );
                if (!activeItem.isClassroom) {
                    setTopicsByGroup(prev => {
                        const groupTopics = prev[activeId] || [];
                        const updated = groupTopics.map(t => (t.id === activeTopicId ? { ...t, subtitle: `You (edited): ${previewText}`, time: timeString } : t));
                        return { ...prev, [activeId]: updated };
                    });
                }
            } else if (classrooms.some(c => c.id === activeId)) {
                setClassrooms(prev =>
                    prev.map(c => (c.id === activeId ? { ...c, subtitle: `You (edited): ${previewText}`, time: timeString } : c))
                );
            }

            setEditingMessageId(null);
        } else {
            // Send new message via Socket.io gateway
            // Use topic-scoped roomId so messages land in the right channel bucket
            const roomId = activeItem.isClassroom ? activeId : `${activeId}-${activeTopicId}`;
            const optimisticId = `optimistic-${Date.now()}`;

            // Optimistically add message locally so it appears immediately
            const optimisticMsg = {
                id: optimisticId,
                sender: 'Gelila Sintayehu',
                initials: 'GS',
                avatarClass: 'gs',
                avatarBg: '#3b82f6',
                text: inputValue,
                image: attachedImage || undefined,
                time: timeString,
                incoming: false,
                reactions: [],
                isPinned: false,
                replyTo: replyingTo ? { id: replyingTo.id, sender: replyingTo.sender, text: replyingTo.text } : undefined
            };

            setMessagesByGroup(prev => ({
                ...prev,
                [roomId]: [...(prev[roomId] || []), optimisticMsg]
            }));

            // Update sidebar preview immediately
            const previewText = attachedImage ? '📷 Image attachment' : inputValue;
            if (studyGroups.some(g => g.id === activeId)) {
                setStudyGroups(prev =>
                    prev.map(g => (g.id === activeId ? { ...g, subtitle: `You: ${previewText}`, time: timeString } : g))
                );
            } else if (classrooms.some(c => c.id === activeId)) {
                setClassrooms(prev =>
                    prev.map(c => (c.id === activeId ? { ...c, subtitle: `You: ${previewText}`, time: timeString } : c))
                );
            }

            if (socketRef.current) {
                socketRef.current.emit('sendMessage', {
                    roomId,
                    senderId: 'gs',
                    text: inputValue,
                    image: attachedImage || undefined,
                    replyToId: replyingTo ? replyingTo.id : undefined,
                    _optimisticId: optimisticId
                });
            }
        }

        setInputValue('');
        setAttachedImage(null);
        setShowEmojiPicker(false);
        setReplyingTo(null);
    };

    // Handle deleting a message
    const handleDeleteMessage = (messageId) => {
        setMessagesByGroup(prev => {
            const activeMessagesList = prev[activeMessagesKey] || [];
            const filteredMessages = activeMessagesList.filter(msg => msg.id !== messageId);
            return {
                ...prev,
                [activeMessagesKey]: filteredMessages
            };
        });

        // Update sidebar preview to "Message deleted" if it was the last preview
        setMessagesByGroup(current => {
            const activeMessagesList = current[activeMessagesKey] || [];
            const wasLastMessage = activeMessagesList.length > 0 && activeMessagesList[activeMessagesList.length - 1].id === messageId;
            if (wasLastMessage) {
                const textPreview = 'Message deleted';
                if (studyGroups.some(g => g.id === activeId)) {
                    setStudyGroups(prev =>
                        prev.map(g => (g.id === activeId ? { ...g, subtitle: textPreview } : g))
                    );
                    if (!activeItem.isClassroom) {
                        setTopicsByGroup(prev => {
                            const groupTopics = prev[activeId] || [];
                            const updated = groupTopics.map(t => (t.id === activeTopicId ? { ...t, subtitle: textPreview } : t));
                            return { ...prev, [activeId]: updated };
                        });
                    }
                } else if (classrooms.some(c => c.id === activeId)) {
                    setClassrooms(prev =>
                        prev.map(c => (c.id === activeId ? { ...c, subtitle: textPreview } : c))
                    );
                }
            }
            return current;
        });
    };

    // Handle deleting a study group
    const handleDeleteGroup = (groupId, e) => {
        if (e) e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this study group?')) {
            fetch(`${API_BASE_URL}/chat/groups/${groupId}`, {
                method: 'DELETE'
            })
            .catch(err => console.error('Failed to delete group:', err));
        }
    };

    // Handle deleting a study topic channel
    const handleDeleteTopic = (groupId, topicId, e) => {
        if (e) e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete the topic "${topicId}"?`)) {
            fetch(`${API_BASE_URL}/chat/groups/${groupId}-${topicId}`, {
                method: 'DELETE'
            })
            .catch(err => console.error('Failed to delete topic:', err));
        }
    };

    // Handle removing a member from group
    const handleRemoveMember = (memberId) => {
        if (window.confirm(`Are you sure you want to remove ${USER_PROFILES[memberId]?.name || memberId} from this group?`)) {
            fetch(`${API_BASE_URL}/chat/groups/${activeId}/members/${memberId}`, {
                method: 'DELETE'
            })
            .then(res => {
                if (res.ok) {
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    setToastMessage(`${USER_PROFILES[memberId]?.name} removed from the group.`);
                    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
                }
            })
            .catch(err => console.error('Failed to remove member:', err));
        }
    };

    // Handle starting message edit mode
    const handleStartEdit = (msg) => {
        setEditingMessageId(msg.id);
        setInputValue(msg.text);
        if (msg.image) {
            setAttachedImage(msg.image);
        }
        setShowEmojiPicker(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Trigger Custom Context Menu
    const handleContextMenu = (e, msg) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            message: msg
        });
    };

    // Forward message to a classroom or study group
    const handleForwardMessage = (targetChannelId) => {
        if (!forwardingMessage) return;

        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newForwardMsg = {
            id: `msg-${Date.now()}`,
            sender: 'Gelila Sintayehu',
            initials: 'GS',
            avatarClass: 'gs',
            text: forwardingMessage.text,
            image: forwardingMessage.image,
            time: timeString,
            incoming: false,
            reactions: [],
            forwardedFrom: forwardingMessage.sender
        };

        setMessagesByGroup(prev => ({
            ...prev,
            [targetChannelId]: [...(prev[targetChannelId] || []), newForwardMsg]
        }));

        // Update target channel's preview in the sidebar
        const targetItem = studyGroups.find(g => g.id === targetChannelId) || classrooms.find(c => c.id === targetChannelId);
        const textPreview = forwardingMessage.text ? `Forwarded: ${forwardingMessage.text}` : '📷 Forwarded image';
        if (studyGroups.some(g => g.id === targetChannelId)) {
            setStudyGroups(prev =>
                prev.map(g => (g.id === targetChannelId ? { ...g, subtitle: textPreview, time: timeString } : g))
            );
        } else if (classrooms.some(c => c.id === targetChannelId)) {
            setClassrooms(prev =>
                prev.map(c => (c.id === targetChannelId ? { ...c, subtitle: textPreview, time: timeString } : c))
            );
        }

        setForwardingMessage(null);

        // Display toast notice
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setToastMessage(`Message forwarded to "${targetItem?.name}"!`);
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    // Copy to clipboard from context menu
    const handleCopyMessageText = (msg) => {
        if (!msg.text) return;
        navigator.clipboard.writeText(msg.text)
            .then(() => {
                if (toastTimeoutRef.current) {
                    clearTimeout(toastTimeoutRef.current);
                }
                setToastMessage('Message copied to clipboard!');
                toastTimeoutRef.current = setTimeout(() => {
                    setToastMessage(null);
                }, 2000);
            });
    };

    // Add a new member to the active group
    const handleAddGroupMember = (memberId) => {
        setStudyGroups(prev =>
            prev.map(g => {
                if (g.id === activeId) {
                    return {
                        ...g,
                        members: [...(g.members || []), memberId]
                    };
                }
                return g;
            })
        );

        const addedUser = USER_PROFILES[memberId];
        const addedText = `Gelila Sintayehu added ${addedUser?.name || memberId} to the group`;

        setMessagesByGroup(prev => ({
            ...prev,
            [activeId]: [
                ...(prev[activeId] || []),
                { id: `sys-added-${Date.now()}`, type: 'system', text: addedText }
            ]
        }));

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setToastMessage(`${addedUser?.name} added to the group!`);
        toastTimeoutRef.current = setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    // Render message text with clickable URL links & search highlighting
    const renderMessageText = (text, isIncoming) => {
        if (!text) return null;

        const urlRegex = /(https?:\/\/[^\s]+|classmind\.app\/invite\/[^\s]+|localhost:\d+\/join\/[^\s]+|[^\s]+\.com[^\s]*)/gi;
        const parts = text.split(urlRegex);

        const linkColor = isIncoming
            ? (darkMode ? '#60a5fa' : '#2563eb')
            : '#ffffff';

        const highlightMatches = (content) => {
            if (!inChatSearchQuery.trim()) return content;
            const query = inChatSearchQuery;
            const regex = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
            const subParts = content.split(regex);
            if (subParts.length === 1) return content;
            return subParts.map((sp, idx) =>
                regex.test(sp) ? (
                    <mark key={idx} className="search-matched-text">{sp}</mark>
                ) : (
                    sp
                )
            );
        };

        if (parts.length === 1) return <div>{highlightMatches(text)}</div>;

        return (
            <div>
                {parts.map((part, index) => {
                    if (part.match(urlRegex)) {
                        let hrefUrl = part;
                        if (!part.startsWith('http://') && !part.startsWith('https://')) {
                            hrefUrl = 'https://' + part;
                        }
                        const isInternalJoin = part.includes('/join/');
                        return (
                            <a
                                key={index}
                                href={hrefUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: linkColor, textDecoration: 'underline', fontWeight: '600', cursor: 'pointer' }}
                                onClick={(e) => {
                                    if (isInternalJoin) {
                                        e.preventDefault();
                                        const channelId = part.split('/join/')[1];
                                        if (channelId) {
                                            setJoinPreviewGroupId(channelId);
                                        }
                                    }
                                }}
                            >
                                {part}
                            </a>
                        );
                    }
                    return <span key={index}>{highlightMatches(part)}</span>;
                })}
            </div>
        );
    };

    // Toggle emoji reactions (clicked on reaction badge under message bubble)
    const handleReactionClick = (messageId, emojiIndex) => {
        setMessagesByGroup(prev => {
            const activeMessagesList = prev[activeMessagesKey] || [];
            const updatedMessages = activeMessagesList.map(msg => {
                if (msg.id === messageId) {
                    const reactions = [...msg.reactions];
                    const activeReactionIndex = reactions.findIndex(r => r.userReacted);

                    if (activeReactionIndex === emojiIndex) {
                        // Clicking the same emoji -> remove it
                        reactions[emojiIndex] = {
                            ...reactions[emojiIndex],
                            count: reactions[emojiIndex].count - 1,
                            userReacted: false
                        };
                    } else {
                        // Clicking a different emoji
                        // 1. Remove previous reaction if exists
                        if (activeReactionIndex > -1) {
                            reactions[activeReactionIndex] = {
                                ...reactions[activeReactionIndex],
                                count: reactions[activeReactionIndex].count - 1,
                                userReacted: false
                            };
                        }
                        // 2. Add/increment new reaction
                        reactions[emojiIndex] = {
                            ...reactions[emojiIndex],
                            count: reactions[emojiIndex].count + 1,
                            userReacted: true
                        };
                    }

                    // Clean up 0 count reactions
                    const cleanReactions = reactions.filter(r => r.count > 0);
                    return { ...msg, reactions: cleanReactions };
                }
                return msg;
            });
            return {
                ...prev,
                [activeMessagesKey]: updatedMessages
            };
        });
    };

    // Add a quick reaction emoji directly if not already present (from hover bar)
    const handleAddEmojiReaction = (messageId, emoji) => {
        setMessagesByGroup(prev => {
            const activeMessagesList = prev[activeMessagesKey] || [];
            const updatedMessages = activeMessagesList.map(msg => {
                if (msg.id === messageId) {
                    const reactions = [...msg.reactions];
                    const activeReactionIndex = reactions.findIndex(r => r.userReacted);
                    const targetReactionIndex = reactions.findIndex(r => r.emoji === emoji);

                    if (activeReactionIndex > -1 && reactions[activeReactionIndex].emoji === emoji) {
                        // Clicked same emoji -> Toggle it off
                        reactions[activeReactionIndex] = {
                            ...reactions[activeReactionIndex],
                            count: reactions[activeReactionIndex].count - 1,
                            userReacted: false
                        };
                    } else {
                        // Remove previous active reaction if exists
                        if (activeReactionIndex > -1) {
                            reactions[activeReactionIndex] = {
                                ...reactions[activeReactionIndex],
                                count: reactions[activeReactionIndex].count - 1,
                                userReacted: false
                            };
                        }

                        // Add new/increment target reaction
                        if (targetReactionIndex > -1) {
                            reactions[targetReactionIndex] = {
                                ...reactions[targetReactionIndex],
                                count: reactions[targetReactionIndex].count + 1,
                                userReacted: true
                            };
                        } else {
                            reactions.push({ emoji, count: 1, userReacted: true });
                        }
                    }

                    // Clean up 0 count reactions
                    const cleanReactions = reactions.filter(r => r.count > 0);
                    return { ...msg, reactions: cleanReactions };
                }
                return msg;
            });
            return {
                ...prev,
                [activeMessagesKey]: updatedMessages
            };
        });
    };

    // Handle creating a new study group or classroom
    const handleCreateItem = () => {
        if (!newGroupName.trim()) return;

        const itemId = newGroupName.toLowerCase().replace(/\s+/g, '-');
        const descText = newGroupDesc.trim() || 'No messages yet';

        if (showAddModal.type === 'classroom') {
            const newClassroomObj = {
                id: itemId,
                name: newGroupName,
                subtitle: descText,
                isClassroom: true,
                time: ''
            };
            setClassrooms(prev => [...prev, newClassroomObj]);
            setMessagesByGroup(prev => ({
                ...prev,
                [itemId]: [{ id: `sys-${Date.now()}`, type: 'system', text: `Classroom "${newGroupName}" created` }]
            }));
            setActiveId(itemId);
        } else {
            const tempId = itemId;
            const newGroupObj = {
                id: tempId,
                name: newGroupName,
                subtitle: descText,
                isClassroom: false,
                time: '',
                members: ['gs'],
                icon: '👥',
                color: '#8b5cf6'
            };
            setStudyGroups(prev => [...prev, newGroupObj]);
            setTopicsByGroup(prev => ({
                ...prev,
                [tempId]: [{ id: 'general', name: 'General', icon: '#', color: '#64748b', subtitle: 'General chat room', time: '' }]
            }));
            setSelectedGroupIdForTopics(tempId);
            setActiveTopicId('general');
            setActiveId(tempId);

            fetch(`${API_BASE_URL}/chat/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: tempId,
                    name: newGroupName,
                    description: descText,
                    memberIds: ['gs']
                })
            })
            .then(res => res.json())
            .then(group => {
                // Pre-persist general topic channel
                fetch(`${API_BASE_URL}/chat/groups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: `${tempId}-general`,
                        name: 'General',
                        description: 'General chat room',
                        icon: '#',
                        color: '#64748b',
                        memberIds: []
                    })
                });

                setGroupMemberRoles(prev => ({
                    ...prev,
                    [`${tempId}-gs`]: 'OWNER'
                }));
            })
            .catch(err => console.error('Failed to persist group:', err));
        }

        setNewGroupName('');
        setNewGroupDesc('');
        setShowAddModal({ open: false, type: 'group' });
    };

    // Generate dynamic join link and copy to clipboard
    const handleCopyInvite = () => {
        const inviteLink = `${window.location.origin}/join/${activeId}`;
        navigator.clipboard.writeText(inviteLink)
            .then(() => {
                if (toastTimeoutRef.current) {
                    clearTimeout(toastTimeoutRef.current);
                }
                setToastMessage(`Invite link for "${activeItem.name}" copied to clipboard!`);
                toastTimeoutRef.current = setTimeout(() => {
                    setToastMessage(null);
                }, 3000);
            })
            .catch(() => {
                alert(`Invite Link: ${inviteLink}`);
            });
    };



    // Filter classrooms and study groups by search query
    const filteredClassrooms = classrooms.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredStudyGroups = studyGroups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`chat-layout ${darkMode ? 'dark' : 'light'}`}>

            {/* Float Toast Notification */}
            {toastMessage && (
                <div className="toast-notification">
                    <span>🔗</span>
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Sidebar Panel */}
            {!hideSidebar && (
                <div className={`chat-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>

                    {/* Profile Card */}
                    <div className="profile-card">
                        <div className="profile-info">
                            <div className="profile-avatar">
                                GS
                                <span className="online-dot"></span>
                            </div>
                            <div className="profile-details">
                                <span className="profile-name">Gelila Sintayehu</span>
                                <span className="profile-status">online</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                className="theme-toggle-btn"
                                onClick={() => setDarkMode(!darkMode)}
                                title="Toggle theme"
                            >
                                {darkMode ? (
                                    <Sun size={18} />
                                ) : (
                                    <Moon size={18} />
                                )}
                            </button>

                            <button
                                className="sidebar-close-btn"
                                onClick={() => setMobileSidebarOpen(false)}
                                aria-label="Close Sidebar"
                                title="Close Sidebar"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="search-bar-container">
                        <div className="search-wrapper">
                            <span className="search-icon">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* List of Chats */}
                    <div className="sidebar-list-container">

                        {selectedGroupIdForTopics ? (() => {
                            const activeGrp = studyGroups.find(g => g.id === selectedGroupIdForTopics);
                            if (!activeGrp) return null;
                            const topics = topicsByGroup[selectedGroupIdForTopics] || [];
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    {/* Telegram-style Group Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                                        <button
                                            onClick={() => setSelectedGroupIdForTopics(null)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                            title="Back to Chats"
                                        >
                                            <ArrowLeft size={17} />
                                        </button>
                                        <div style={{
                                            width: '34px', height: '34px', borderRadius: '50%',
                                            background: activeGrp.color || '#6366f1',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '16px', flexShrink: 0
                                        }}>
                                            {activeGrp.icon || '👥'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {activeGrp.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {activeGrp.members ? activeGrp.members.length : 1} members
                                            </div>
                                        </div>
                                        <button
                                            className="add-group-btn"
                                            onClick={() => setShowCreateTopicModal(true)}
                                            title="New Topic"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </div>

                                    {/* Section label */}
                                    <div style={{ padding: '6px 14px 2px', fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                        Topics
                                    </div>

                                    {/* Telegram-style # channel list */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 6px' }}>
                                        {topics.length === 0 && (
                                            <div style={{ padding: '18px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                                No topics yet. Create one with +
                                            </div>
                                        )}
                                        {topics.map(t => {
                                            const topicMsgs = messagesByGroup[`${selectedGroupIdForTopics}-${t.id}`] || [];
                                            const lastMsg = topicMsgs.filter(m => m.type !== 'system').slice(-1)[0];
                                            const lastMsgPreview = lastMsg ? (lastMsg.text || (lastMsg.image ? '📷 Photo' : '📎 File')) : 'No messages yet';
                                            const lastMsgTime = lastMsg?.time || t.time || '';
                                            const isActive = activeTopicId === t.id;
                                            return (
                                                <div
                                                    key={t.id}
                                                    onClick={() => { setActiveTopicId(t.id); setMobileSidebarOpen(false); }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '9px 10px',
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        background: isActive ? 'var(--active-item-bg, rgba(99,102,241,0.15))' : 'transparent',
                                                        transition: 'background 0.15s'
                                                    }}
                                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover-bg, rgba(255,255,255,0.05))'; }}
                                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    {/* # hash icon box */}
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '10px',
                                                        background: isActive ? (t.color || '#6366f1') : 'var(--search-bg, rgba(255,255,255,0.08))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '15px', fontWeight: '800', color: isActive ? 'white' : 'var(--text-muted)',
                                                        flexShrink: 0, transition: 'all 0.15s'
                                                    }}>
                                                        {t.id === 'general' ? '#' : t.icon || '#'}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{
                                                                fontSize: '13px', fontWeight: isActive ? '700' : '600',
                                                                color: isActive ? 'var(--text-main)' : 'var(--text-main)',
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                            }}># {t.name}</span>
                                                            {lastMsgTime && <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', flexShrink: 0 }}>{lastMsgTime}</span>}
                                                        </div>
                                                        <span style={{
                                                            fontSize: '11.5px', color: 'var(--text-muted)',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block'
                                                        }}>{lastMsgPreview}</span>
                                                    </div>
                                                    {(() => {
                                                        const myRole = groupMemberRoles[`${selectedGroupIdForTopics}-gs`] || 'OWNER';
                                                        if (t.id !== 'general' && (myRole === 'OWNER' || myRole === 'ADMIN')) {
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteTopic(selectedGroupIdForTopics, t.id, e)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        color: '#ef4444',
                                                                        cursor: 'pointer',
                                                                        padding: '4px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        borderRadius: '4px',
                                                                        flexShrink: 0
                                                                    }}
                                                                    title="Delete Topic"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })() : (
                            <>
                                {/* Classrooms Section */}
                                <div className="section-header">
                                    <span>Classrooms</span>
                                    <button
                                        className="add-group-btn"
                                        title="Create Classroom"
                                        onClick={() => setShowAddModal({ open: true, type: 'classroom' })}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {filteredClassrooms.map(c => (
                                    <div
                                        key={c.id}
                                        className={`sidebar-item ${activeId === c.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveId(c.id);
                                            setSelectedGroupIdForTopics(null);
                                            setMobileSidebarOpen(false);
                                        }}
                                    >
                                        <div className="item-avatar classroom">
                                            {/* Classroom Icon */}
                                            <BookOpen size={20} />
                                        </div>
                                        <div className="item-text-container">
                                            <div className="item-title-row">
                                                <span className="item-title">{c.name}</span>
                                                {c.time && <span className="item-time">{c.time}</span>}
                                            </div>
                                            <span className="item-subtitle">{c.subtitle}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Study Groups Section */}
                                <div className="section-header">
                                    <span>Study Groups</span>
                                    <button
                                        className="add-group-btn"
                                        title="Create Study Group"
                                        onClick={() => setShowAddModal({ open: true, type: 'group' })}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {filteredStudyGroups.map(g => (
                                    <div
                                        key={g.id}
                                        className={`sidebar-item ${activeId === g.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveId(g.id);
                                            setSelectedGroupIdForTopics(g.id);
                                            setActiveTopicId('general');
                                            setMobileSidebarOpen(false);
                                        }}
                                    >
                                        <div
                                            className="item-avatar study-group"
                                            style={{
                                                background: g.color || 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                                fontSize: '18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                boxShadow: 'none'
                                            }}
                                        >
                                            {g.icon || '👥'}
                                        </div>
                                        <div className="item-text-container" style={{ flex: 1 }}>
                                            <div className="item-title-row">
                                                <span className="item-title">{g.name}</span>
                                                {g.time && <span className="item-time">{g.time}</span>}
                                            </div>
                                            <span className="item-subtitle">{g.subtitle}</span>
                                        </div>
                                        {(() => {
                                            const gRole = groupMemberRoles[`${g.id}-gs`] || 'OWNER';
                                            if (gRole === 'OWNER' || gRole === 'ADMIN') {
                                                return (
                                                    <button
                                                        className="delete-group-btn"
                                                        onClick={(e) => handleDeleteGroup(g.id, e)}
                                                        title="Delete study group"
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            padding: '6px',
                                                            borderRadius: '6px',
                                                            marginLeft: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                ))}
                            </>
                        )}

                        {filteredClassrooms.length === 0 && filteredStudyGroups.length === 0 && (
                            <div style={{ padding: '20px 10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                No conversations found
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* Main Chat Pane */}
            <div className="chat-pane">

                {/* Chat Header */}
                <div className="chat-header">
                    <div className="chat-header-info">
                        {!hideSidebar && (
                            <button
                                className="mobile-sidebar-toggle"
                                onClick={() => setMobileSidebarOpen(true)}
                                aria-label="Open Sidebar"
                                title="Open Sidebar"
                            >
                                <Menu size={20} />
                            </button>
                        )}
                        {hideSidebar && (
                            <button
                                type="button"
                                className="chat-header-back-btn"
                                onClick={() => setActiveId(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    marginRight: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px'
                                }}
                                title="Back to classroom members"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div
                            className="header-avatar"
                            style={{
                                cursor: 'pointer',
                                background: activeItem.color || 'var(--active-item-border)',
                                fontSize: !activeItem.isClassroom ? '24px' : '15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}
                            onClick={() => !activeItem.isClassroom && setShowGroupInfoModal(true)}
                        >
                            {!activeItem.isClassroom ? (activeItem.icon || '👥') : activeItem.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div
                            className="header-details"
                            style={{ cursor: 'pointer' }}
                            onClick={() => !activeItem.isClassroom && setShowGroupInfoModal(true)}
                        >
                            <span className="header-title">
                                {activeItem.name}
                                {!activeItem.isClassroom && activeTopicId && (
                                    <span style={{ color: 'var(--active-item-border)', fontSize: '13px', marginLeft: '8px', fontWeight: '600', opacity: 0.85 }}>
                                        # {activeTopicId}
                                    </span>
                                )}
                            </span>
                            <span className="header-subtitle">
                                {typingUser ? (
                                    <span style={{ color: 'var(--active-item-border)', fontWeight: '500' }}>
                                        💬 {typingUser} is typing...
                                    </span>
                                ) : (
                                    activeItem.isClassroom ? (
                                        'Classroom channel'
                                    ) : (
                                        `${activeItem.members ? activeItem.members.length : 1} members · ${activeItem.members ? activeItem.members.filter(m => USER_PROFILES[m]?.online).length : 1
                                        } online`
                                    )
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="chat-header-actions">
                        {!activeItem.isClassroom && activeItem.members && (
                            <div className="members-stack">
                                {activeItem.members.map(memberId => {
                                    const user = USER_PROFILES[memberId];
                                    if (!user) return null;
                                    return (
                                        <div
                                            key={memberId}
                                            className={`stack-avatar ${memberId}`}
                                            title={user.name}
                                            style={{ backgroundColor: user.avatarBg }}
                                        >
                                            {user.initials}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!activeItem.isClassroom && (
                            <button 
                                className={`invite-btn ${activeVoiceChat?.groupId === activeId ? 'active-voice' : ''}`} 
                                title={activeVoiceChat?.groupId === activeId ? "Voice Chat Active" : "Start Voice Chat"} 
                                onClick={handleToggleVoiceChat} 
                                style={{ 
                                    marginRight: '8px',
                                    backgroundColor: activeVoiceChat?.groupId === activeId ? 'rgba(16, 185, 129, 0.15)' : 'var(--search-bg)',
                                    color: activeVoiceChat?.groupId === activeId ? '#10b981' : 'var(--text-main)',
                                    border: activeVoiceChat?.groupId === activeId ? '1px solid #10b981' : 'none'
                                }}
                            >
                                <Phone size={18} />
                            </button>
                        )}
                        <button
                            className="invite-btn"
                            title={showInChatSearch ? "Close search" : "Search in conversation"}
                            onClick={() => {
                                setShowInChatSearch(!showInChatSearch);
                                if (showInChatSearch) setInChatSearchQuery('');
                            }}
                            style={{
                                marginRight: '8px',
                                backgroundColor: showInChatSearch ? 'var(--active-item-border)' : 'var(--search-bg)',
                                color: showInChatSearch ? '#ffffff' : 'var(--text-main)'
                            }}
                        >
                            <Search size={18} />
                        </button>
                        {!activeItem.isClassroom && (
                            <button className="invite-btn" title="Create Study Topic" onClick={() => setShowCreateTopicModal(true)} style={{ marginRight: '8px' }}>
                                <BookOpen size={18} />
                            </button>
                        )}
                        <button className="invite-btn" title="Copy Invite Link" onClick={() => setShowAddMemberModal(true)}>
                            <Link size={18} />
                        </button>
                    </div>
                </div>

                {/* In-Chat Message Search Bar */}
                {showInChatSearch && (
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--search-bg)' }}>
                        <div className="inchat-search-bar">
                            <Search size={16} color="var(--text-muted)" />
                            <input
                                type="text"
                                placeholder="Search in this conversation..."
                                value={inChatSearchQuery}
                                onChange={(e) => {
                                    setInChatSearchQuery(e.target.value);
                                    setSearchMatchIndex(0);
                                }}
                                className="inchat-search-input"
                                autoFocus
                            />
                            {matchedMessageIds.length > 0 && (
                                <span className="inchat-search-counter">
                                    {searchMatchIndex + 1} of {matchedMessageIds.length}
                                </span>
                            )}
                            {matchedMessageIds.length > 0 && (
                                <>
                                    <button className="inchat-search-btn" onClick={handlePrevSearchMatch} title="Previous match">
                                        <ChevronUp size={16} />
                                    </button>
                                    <button className="inchat-search-btn" onClick={handleNextSearchMatch} title="Next match">
                                        <ChevronDown size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setShowInChatSearch(false);
                                setInChatSearchQuery('');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Pinned Message Banner */}
                {pinnedMessage && (
                    <div
                        className="pinned-message-banner"
                        onClick={() => handleJumpToMessage(pinnedMessage.id)}
                        title="Click to jump to pinned message"
                    >
                        <div className="pinned-icon">📌</div>
                        <div className="pinned-content">
                            <div className="pinned-title">Pinned Message</div>
                            <div className="pinned-snippet">{pinnedMessage.text || pinnedMessage.fileName || 'Pinned attachment'}</div>
                        </div>
                        {(groupMemberRoles[`${activeId}-gs`] === 'OWNER' || groupMemberRoles[`${activeId}-gs`] === 'ADMIN') && (
                            <button
                                className="pinned-unpin-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePinMessage(pinnedMessage);
                                }}
                                title="Unpin message"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Voice Chat active panel */}
                {voiceCallStatus !== null && activeVoiceChat?.groupId === activeId && (
                    <div className="voice-chat-bar" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        backgroundColor: 'var(--search-bg, rgba(255,255,255,0.04))',
                        borderBottom: '1px solid var(--border-color)',
                        animation: 'slideDown 0.25s ease-out',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="pulsing-green-dot" style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                                animation: 'pulse 1.5s infinite'
                            }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>Group Voice Chat</span>
                                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '600' }}>
                                    {voiceCallStatus === 'connecting' ? 'Connecting...' : 'Active call'}
                                </span>
                            </div>
                        </div>

                        {/* Call participants */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeVoiceChat.participants.map(p => (
                                <div
                                    key={p.userId}
                                    style={{
                                        position: 'relative',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: p.avatarBg || '#6366f1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: 'white',
                                        border: p.speaking ? '2px solid #10b981' : '1px solid transparent',
                                        boxShadow: p.speaking ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                                        transition: 'all 0.15s'
                                    }}
                                    title={`${p.username || p.userId} ${p.muted ? '(Muted)' : ''}`}
                                >
                                    {p.initials}
                                    {p.muted && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-2px',
                                            right: '-2px',
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: '#ef4444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid var(--chat-pane-bg, #1e293b)'
                                        }}>
                                            <MicOff size={7} color="white" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Action controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {voiceCallStatus === 'connected' && (
                                <button
                                    onClick={handleToggleLocalMute}
                                    style={{
                                        background: localMuted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.06)',
                                        border: 'none',
                                        color: localMuted ? '#ef4444' : 'var(--text-main)',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        fontSize: '11.5px',
                                        fontWeight: '600'
                                    }}
                                >
                                    {localMuted ? <MicOff size={14} /> : <Mic size={14} />}
                                    {localMuted ? 'Muted' : 'Mute'}
                                </button>
                            )}
                            <button
                                onClick={handleLeaveVoiceChat}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: 'none',
                                    color: '#ef4444',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: '600'
                                }}
                            >
                                <LogOut size={14} />
                                Leave
                            </button>
                        </div>
                    </div>
                )}

                {/* Embedded horizontal topics selector (when sidebar is hidden) */}
                {hideSidebar && !activeItem.isClassroom && (
                    <div className="topics-horizontal-bar" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'var(--search-bg, rgba(255,255,255,0.03))',
                        overflowX: 'auto',
                        flexShrink: 0
                    }}>
                        {(topicsByGroup[activeId] || []).map(t => {
                            const isActive = activeTopicId === t.id;
                            const myRole = groupMemberRoles[`${activeId}-gs`] || 'OWNER';
                            const showDelete = t.id !== 'general' && (myRole === 'OWNER' || myRole === 'ADMIN');
                            return (
                                <div
                                    key={t.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        borderRadius: '20px',
                                        backgroundColor: isActive ? 'var(--active-item-border, #6366f1)' : 'rgba(255,255,255,0.06)',
                                        padding: showDelete ? '2px 4px 2px 12px' : '6px 12px',
                                        transition: 'all 0.15s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setActiveTopicId(t.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: isActive ? 'white' : 'var(--text-muted)',
                                            padding: showDelete ? '4px 0' : '0',
                                            paddingRight: showDelete ? '4px' : '0'
                                        }}
                                    >
                                        <span>{t.id === 'general' ? '#' : t.icon || '#'}</span>
                                        <span>{t.name}</span>
                                    </button>
                                    {showDelete && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteTopic(activeId, t.id, e)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: isActive ? 'rgba(255,255,255,0.8)' : '#ef4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(0,0,0,0.1)'
                                            }}
                                            title="Delete Topic"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setShowCreateTopicModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                border: '1px dashed var(--text-muted)',
                                background: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                flexShrink: 0
                            }}
                            title="Create Topic"
                        >
                            +
                        </button>
                    </div>
                )}

                {/* Conversation Message Pane */}
                <div className="conversation-pane" ref={conversationPaneRef}>
                    {activeMessages.length > 0 ? (
                        activeMessages.map((msg, index) => {
                            if (msg.type === 'system') {
                                return (
                                    <div key={msg.id} className="system-message">
                                        {msg.text}
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={msg.id}
                                    className={`message-row ${msg.incoming ? 'incoming' : 'outgoing'}`}
                                    onContextMenu={(e) => handleContextMenu(e, msg)}
                                >
                                    {msg.incoming && (
                                        <div className={`message-avatar ${msg.avatarClass}`}>
                                            {msg.initials}
                                        </div>
                                    )}
                                    <div className="message-content-wrapper">
                                        {/* Hover Quick-Reaction Bar */}
                                        <div className="message-reaction-bar">
                                            {['👍', '❤️', '😂', '💪', '🔥', '✅'].map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    className="reaction-bar-btn"
                                                    onClick={() => handleAddEmojiReaction(msg.id, emoji)}
                                                    title={`React with ${emoji}`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}

                                            {/* Edit outgoing messages only */}
                                            {!msg.incoming && (
                                                <button
                                                    className="reaction-bar-btn"
                                                    onClick={() => handleStartEdit(msg)}
                                                    title="Edit message"
                                                    style={{ borderLeft: '1px solid var(--border-color)', borderRadius: 0, paddingLeft: '6px', marginLeft: '2px', display: 'inline-flex', alignItems: 'center' }}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            )}

                                            {/* Delete messages */}
                                            <button
                                                className="reaction-bar-btn"
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                title="Delete message"
                                                style={{ display: 'inline-flex', alignItems: 'center' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {msg.incoming && (
                                            <span className={`sender-name ${msg.sender.startsWith('Abebe') ? 'abebe' : 'yonas'}`}>
                                                {msg.sender}
                                            </span>
                                        )}
                                        <div className="message-bubble" id={`msg-bubble-${msg.id}`}>
                                            {msg.replyTo && (
                                                <div
                                                    className="reply-preview-bubble"
                                                    onClick={() => {
                                                        const targetEl = document.getElementById(`msg-bubble-${msg.replyTo.id}`);
                                                        if (targetEl) {
                                                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            targetEl.style.backgroundColor = 'var(--active-item-bg)';
                                                            setTimeout(() => {
                                                                targetEl.style.backgroundColor = '';
                                                            }, 1000);
                                                        }
                                                    }}
                                                >
                                                    <span className="reply-sender-name">{msg.replyTo.sender}</span>
                                                    <span className="reply-preview-text">{msg.replyTo.text || '📷 Image'}</span>
                                                </div>
                                            )}
                                            {msg.forwardedFrom && (
                                                <div style={{ fontSize: '11px', color: 'var(--active-item-border)', fontStyle: 'italic', marginBottom: '4px' }}>
                                                    Forwarded from {msg.forwardedFrom}
                                                </div>
                                            )}
                                            {msg.text && msg.type !== 'audio' && renderMessageText(msg.text, msg.incoming)}
                                            {msg.image && (
                                                <img
                                                    src={msg.image}
                                                    alt="attachment"
                                                    className="message-image"
                                                    onClick={() => {
                                                        const w = window.open();
                                                        w.document.write(`<img src="${msg.image}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                                                    }}
                                                />
                                            )}

                                            {/* Document Attachment bubble */}
                                            {msg.type === 'document' && (
                                                <div className="document-attachment-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: msg.incoming ? 'var(--search-bg)' : 'rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '6px', border: '1px solid var(--border-color)', minWidth: '220px' }}>
                                                    <div style={{ fontSize: '24px', backgroundColor: 'var(--sidebar-bg)', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                                        {msg.fileIcon || '📄'}
                                                    </div>
                                                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                                        <span className="file-name" style={{ fontSize: '13px', fontWeight: '600', color: msg.incoming ? 'var(--text-main)' : '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                            {msg.fileName}
                                                        </span>
                                                        <span className="file-size" style={{ fontSize: '11px', color: msg.incoming ? 'var(--text-muted)' : 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                                            {msg.fileSize}
                                                        </span>
                                                    </div>
                                                    {msg.fileDataUrl ? (
                                                        <a href={msg.fileDataUrl} download={msg.fileName} style={{ fontSize: '18px', color: msg.incoming ? 'var(--active-item-border)' : '#ffffff', cursor: 'pointer', textDecoration: 'none' }}>
                                                            📥
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: '18px', opacity: 0.6, cursor: 'default' }}>
                                                            📄
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Grouped album gallery attachments bubble */}
                                            {msg.type === 'grouped' && msg.files && (
                                                <div className="grouped-attachments-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginTop: '6px', minWidth: '240px' }}>
                                                    {msg.files.map((file, idx) => (
                                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '8px', backgroundColor: msg.incoming ? 'var(--search-bg)' : 'rgba(255,255,255,0.15)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', textAlign: 'left' }}>
                                                            {file.isImage && file.data ? (
                                                                <img src={file.data} alt={file.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer' }} onClick={() => {
                                                                    const w = window.open();
                                                                    w.document.write(`<img src="${file.data}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                                                                }} />
                                                            ) : (
                                                                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', backgroundColor: 'var(--sidebar-bg)', borderRadius: '8px', marginBottom: '6px' }}>
                                                                    {file.icon}
                                                                </div>
                                                            )}
                                                            <span style={{ fontSize: '11px', fontWeight: '600', color: msg.incoming ? 'var(--text-main)' : '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={file.name}>
                                                                {file.name}
                                                            </span>
                                                            <span style={{ fontSize: '9.5px', color: msg.incoming ? 'var(--text-muted)' : 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                                                {file.size}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Audio Voice Note Player bubble */}
                                            {msg.type === 'audio' && (() => {
                                                const audioEl = audioPlayerRefs.current[msg.id];
                                                const curTime = audioEl ? audioEl.currentTime : 0;
                                                let dur = audioEl ? audioEl.duration : 0;
                                                if (!dur || dur === Infinity || isNaN(dur)) {
                                                    dur = getAudioDurationFromFileName(msg.fileName);
                                                }
                                                const progressPercent = dur > 0 ? (curTime / dur) * 100 : 0;

                                                return (
                                                    <div className="audio-player-bubble">
                                                        <button
                                                            type="button"
                                                            className="audio-play-btn"
                                                            onClick={() => {
                                                                const el = audioPlayerRefs.current[msg.id];
                                                                if (el) {
                                                                    if (activeAudioPlayingId === msg.id) {
                                                                        el.pause();
                                                                        setActiveAudioPlayingId(null);
                                                                    } else {
                                                                        Object.values(audioPlayerRefs.current).forEach(a => a && a.pause());
                                                                        el.play().catch(err => console.error("Playback failed:", err));
                                                                        setActiveAudioPlayingId(msg.id);
                                                                    }
                                                                }
                                                            }}
                                                            title={activeAudioPlayingId === msg.id ? "Pause" : "Play Voice Message"}
                                                        >
                                                            {activeAudioPlayingId === msg.id ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                                                        </button>
                                                        <div className="audio-info">
                                                            <div
                                                                className="audio-scrubber-track"
                                                                onClick={(e) => {
                                                                    const el = audioPlayerRefs.current[msg.id];
                                                                    if (el) {
                                                                        let clickDur = el.duration;
                                                                        if (!clickDur || clickDur === Infinity || isNaN(clickDur)) {
                                                                            clickDur = getAudioDurationFromFileName(msg.fileName);
                                                                        }
                                                                        if (clickDur) {
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const pos = (e.clientX - rect.left) / rect.width;
                                                                            el.currentTime = pos * clickDur;
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                <div
                                                                    className="audio-scrubber-fill"
                                                                    style={{ width: `${progressPercent}%` }}
                                                                />
                                                            </div>
                                                            <div className="audio-time-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                                <span>{formatAudioTime(curTime)} / {formatAudioTime(dur)}</span>
                                                                <span>{msg.fileSize || 'Audio'}</span>
                                                            </div>
                                                            <audio
                                                                ref={el => (audioPlayerRefs.current[msg.id] = el)}
                                                                src={msg.audioUrl || msg.text}
                                                                onTimeUpdate={() => {
                                                                    setActiveAudioProgress(prev => ({ ...prev, [msg.id]: Date.now() }));
                                                                }}
                                                                onEnded={() => setActiveAudioPlayingId(null)}
                                                                style={{ display: 'none' }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            <span className="message-meta">
                                                {msg.time}
                                                {!msg.incoming && (
                                                    <span className="checkmark-icon">
                                                        <CheckCheck size={14} color={darkMode ? "#3b82f6" : "#ffffff"} />
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Reactions display list */}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className="reactions-list">
                                                {msg.reactions.map((react, rIdx) => (
                                                    <button
                                                        key={rIdx}
                                                        className={`reaction-badge ${react.userReacted ? 'active' : ''}`}
                                                        onClick={() => handleReactionClick(msg.id, rIdx)}
                                                    >
                                                        <span>{react.emoji}</span>
                                                        <span>{react.count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <MessageSquare size={36} color="var(--active-item-border)" />
                            </div>
                            <div className="empty-state-title">No messages yet</div>
                            <div className="empty-state-desc">Send a message to start the conversation in this channel!</div>
                        </div>
                    )}

                </div>

                {/* Image Attachment Preview */}
                {attachedImage && (
                    <div className="image-preview-container">
                        <div className="preview-thumbnail-wrapper">
                            <img src={attachedImage} alt="Preview" className="preview-thumbnail" />
                            <button className="remove-preview-btn" onClick={() => setAttachedImage(null)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                        </div>
                    </div>
                )}

                {/* Replying Message Quoted Banner */}
                {replyingTo && (
                    <div className="reply-input-banner">
                        <div className="reply-banner-details">
                            <span className="reply-banner-title">Reply to {replyingTo.sender}</span>
                            <span className="reply-banner-preview">{replyingTo.text || '📷 Image'}</span>
                        </div>
                        <button
                            className="close-banner-btn"
                            onClick={() => setReplyingTo(null)}
                            title="Cancel reply"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Editing Message Banner */}
                {editingMessageId && (
                    <div className="image-preview-container" style={{ justifyContent: 'space-between', padding: '8px 24px', backgroundColor: 'var(--search-bg)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--active-item-border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Pencil size={14} /> Editing message...
                        </span>
                        <button
                            onClick={() => {
                                setEditingMessageId(null);
                                setInputValue('');
                                setAttachedImage(null);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <div className="emoji-picker-popover">
                        <div className="emoji-picker-header">Select Emoji</div>
                        <div className="emoji-picker-grid">
                            {CURATED_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        setInputValue(prev => prev + emoji);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Footer */}
                <div className="chat-footer">
                    <div className="input-bar">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />

                        {/* Attachment Button */}
                        <button className="input-action-btn" title="Attach files" onClick={triggerFileSelect} disabled={isRecordingVoice}>
                            <Paperclip size={20} />
                        </button>

                        {isRecordingVoice ? (
                            <div className="voice-recording-bar">
                                <div className="rec-indicator">
                                    <div className="rec-dot" />
                                    <span className="rec-timer">
                                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="rec-waveforms">
                                    {[40, 70, 30, 90, 50, 80, 60, 100, 45, 65, 85, 35].map((h, i) => (
                                        <div key={i} className="rec-wave-bar" style={{ animationDelay: `${i * 0.08}s`, height: `${h * 0.2}px` }} />
                                    ))}
                                </div>
                                <button className="rec-cancel-btn" onClick={handleCancelVoiceRecording} title="Cancel recording">
                                    <Trash2 size={18} />
                                </button>
                                <button className="rec-send-btn" onClick={handleSendVoiceRecording} title="Send voice message">
                                    <Send size={16} />
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Message input */}
                                <textarea
                                    placeholder="Write a message..."
                                    className="message-textarea"
                                    rows="1"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />

                                {/* Quick Emoji Reaction trigger */}
                                <button
                                    className="input-action-btn"
                                    title="Add emoji"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile size={20} />
                                </button>

                                {/* Send / Voice Record Button */}
                                {inputValue.trim() || attachedImage ? (
                                    <button
                                        className="send-btn"
                                        onClick={handleSendMessage}
                                        title={editingMessageId ? "Update Message" : "Send Message"}
                                    >
                                        {editingMessageId ? (
                                            <Check size={18} color="var(--active-item-border)" />
                                        ) : (
                                            <Send size={18} />
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="input-action-btn"
                                        title="Record voice message"
                                        onClick={handleStartVoiceRecording}
                                        style={{ color: 'var(--active-item-border)' }}
                                    >
                                        <Mic size={20} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </div>

            {/* Create Study Group Modal */}
            <CreateGroup
                isOpen={showAddModal.open && showAddModal.type === 'group'}
                onClose={() => {
                    setShowAddModal({ open: false, type: 'group' });
                    onCloseCreateGroupDirectly?.();
                }}
                onCreate={(groupDetails) => {
                    const memberList = ['gs', ...groupDetails.members];
                    
                    fetch(`${API_BASE_URL}/chat/groups`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: groupDetails.name,
                            description: groupDetails.topic || 'No messages yet',
                            icon: groupDetails.icon || '👥',
                            color: groupDetails.color || '#6366f1',
                            memberIds: memberList
                        })
                    })
                    .then(res => res.json())
                    .then(g => {
                        const newGroupObj = {
                            id: g.id,
                            name: g.name,
                            subtitle: g.description || 'No messages yet',
                            isClassroom: false,
                            time: '',
                            icon: g.icon || '👥',
                            color: g.color || '#6366f1',
                            members: memberList
                        };

                        const memberNames = groupDetails.members.map(mId => USER_PROFILES[mId]?.name || mId);
                        let joinedText = '';
                        if (memberNames.length > 0) {
                            if (memberNames.length === 1) {
                                joinedText = `Gelila Sintayehu added ${memberNames[0]} to the group`;
                            } else if (memberNames.length === 2) {
                                joinedText = `Gelila Sintayehu added ${memberNames[0]} and ${memberNames[1]} to the group`;
                            } else {
                                const last = memberNames.pop();
                                joinedText = `Gelila Sintayehu added ${memberNames.join(', ')}, and ${last} to the group`;
                            }
                        }

                        // Emit WebSocket studyInvitation to all other invited members
                        if (socketRef.current) {
                            socketRef.current.emit('studyInvitation', {
                                inviterId: 'gs',
                                inviterName: 'Gelila Sintayehu',
                                inviterInitials: 'GS',
                                topicName: groupDetails.topic || 'StatefulWidget Lifecycle',
                                categoryName: `${groupDetails.name} · Study Group`,
                                invitedMembers: groupDetails.members,
                                groupId: g.id
                            });
                        }

                        // Auto-populate topics list inside this study group
                        const topicId = (groupDetails.topic || 'StatefulWidget Lifecycle').toLowerCase().replace(/\s+/g, '-');
                        
                        // Persist general topic channel to DB
                        fetch(`${API_BASE_URL}/chat/groups`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: `${g.id}-general`,
                                name: 'General',
                                description: 'General chat room',
                                icon: '#',
                                color: '#64748b',
                                memberIds: []
                            })
                        })
                        .catch(err => console.error('Failed to create general topic:', err));

                        // Persist initial custom topic channel to DB
                        fetch(`${API_BASE_URL}/chat/groups`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: `${g.id}-${topicId}`,
                                name: groupDetails.topic || 'StatefulWidget Lifecycle',
                                description: `Topic room for ${groupDetails.topic || 'StatefulWidget Lifecycle'}`,
                                icon: (groupDetails.topic || 'StatefulWidget Lifecycle')[0].toUpperCase(),
                                color: '#0d9488',
                                memberIds: []
                            })
                        })
                        .catch(err => console.error('Failed to create topic:', err));

                        setTopicsByGroup(prev => ({
                            ...prev,
                            [g.id]: [
                                { id: 'general', name: 'General', icon: '#', color: '#64748b', subtitle: 'General room', time: '' },
                                { id: topicId, name: groupDetails.topic || 'StatefulWidget Lifecycle', icon: (groupDetails.topic || 'StatefulWidget Lifecycle')[0].toUpperCase(), color: '#0d9488', subtitle: 'Main topic', time: '' }
                            ]
                        }));

                        setGroupMemberRoles(prev => {
                            const updated = { ...prev };
                            updated[`${g.id}-gs`] = 'OWNER';
                            groupDetails.members.forEach(mId => {
                                updated[`${g.id}-${mId}`] = 'MEMBER';
                            });
                            return updated;
                        });

                        setStudyGroups(prev => {
                            if (prev.some(x => x.id === g.id)) return prev;
                            return [...prev, newGroupObj];
                        });
                        setMessagesByGroup(prev => ({
                            ...prev,
                            [g.id]: [
                                { id: `sys-create-${Date.now()}`, type: 'system', text: `You created the study group "${groupDetails.name}" with study topic "${groupDetails.topic || 'StatefulWidget Lifecycle'}"` },
                                ...(joinedText ? [{ id: `sys-added-${Date.now()}`, type: 'system', text: joinedText }] : [])
                            ]
                        }));
                        setActiveId(g.id);
                        setSelectedGroupIdForTopics(g.id);
                        setActiveTopicId(topicId);
                        setShowAddModal({ open: false, type: 'group' });
                        onCloseCreateGroupDirectly?.();
                        // Show invitation confirmation immediately after group creation
                        if (groupDetails.members && groupDetails.members.length > 0) {
                            setCreatedTopicName(groupDetails.topic || groupDetails.name);
                            setTimeout(() => setShowSendInvitationModal(true), 300);
                        }
                    })
                    .catch(err => console.error('Failed to create study group:', err));
                }}
            />

            {/* Create Classroom Modal */}
            {showAddModal.open && showAddModal.type === 'classroom' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">Create Classroom</div>
                        <input
                            type="text"
                            placeholder="Enter name..."
                            className="modal-input"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateItem();
                            }}
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="Enter description..."
                            className="modal-input"
                            value={newGroupDesc}
                            onChange={(e) => setNewGroupDesc(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateItem();
                            }}
                        />
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => {
                                setNewGroupName('');
                                setNewGroupDesc('');
                                setShowAddModal({ open: false, type: 'group' });
                            }}>
                                Cancel
                            </button>
                            <button className="modal-btn confirm" onClick={handleCreateItem}>
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Context Menu */}
            {contextMenu.visible && (
                <div
                    className="custom-context-menu"
                    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="context-menu-item"
                        onClick={() => {
                            setReplyingTo(contextMenu.message);
                            setContextMenu({ visible: false, x: 0, y: 0, message: null });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Reply size={16} /> Reply
                    </button>
                    <button
                        className="context-menu-item"
                        onClick={() => {
                            handleTogglePinMessage(contextMenu.message);
                            setContextMenu({ visible: false, x: 0, y: 0, message: null });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {contextMenu.message?.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                        {contextMenu.message?.isPinned ? 'Unpin Message' : 'Pin Message'}
                    </button>
                    <button
                        className="context-menu-item"
                        onClick={() => {
                            setForwardingMessage(contextMenu.message);
                            setContextMenu({ visible: false, x: 0, y: 0, message: null });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Forward size={16} /> Forward
                    </button>
                    {contextMenu.message?.text && (
                        <button
                            className="context-menu-item"
                            onClick={() => {
                                handleCopyMessageText(contextMenu.message);
                                setContextMenu({ visible: false, x: 0, y: 0, message: null });
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Copy size={16} /> Copy Text
                        </button>
                    )}
                    {!contextMenu.message?.incoming && (
                        <button
                            className="context-menu-item"
                            onClick={() => {
                                handleStartEdit(contextMenu.message);
                                setContextMenu({ visible: false, x: 0, y: 0, message: null });
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Pencil size={16} /> Edit
                        </button>
                    )}
                    <button
                        className="context-menu-item"
                        onClick={() => {
                            alert(`Message Details:\n\nSender: ${contextMenu.message?.sender}\nTime: ${contextMenu.message?.time}\nID: ${contextMenu.message?.id}`);
                            setContextMenu({ visible: false, x: 0, y: 0, message: null });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Info size={16} /> Details
                    </button>
                    <button
                        className="context-menu-item danger-text"
                        onClick={() => {
                            handleDeleteMessage(contextMenu.message?.id);
                            setContextMenu({ visible: false, x: 0, y: 0, message: null });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            )}

            {/* Forward Picker Modal */}
            {forwardingMessage && (
                <div className="create-group-modal-overlay" onClick={() => setForwardingMessage(null)}>
                    <div className="forward-picker-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="members-modal-header">
                            <h3>Forward Message</h3>
                            <p>Select a group or classroom to forward this message to:</p>
                        </div>
                        <div className="forward-channels-list">
                            {classrooms.map(c => (
                                <div key={c.id} className="forward-channel-row" onClick={() => handleForwardMessage(c.id)}>
                                    <div className="header-avatar" style={{ fontSize: '11px', width: '28px', height: '28px' }}>
                                        {c.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '13.5px', fontWeight: '500' }}>{c.name}</span>
                                </div>
                            ))}
                            {studyGroups.map(g => (
                                <div key={g.id} className="forward-channel-row" onClick={() => handleForwardMessage(g.id)}>
                                    <div className="header-avatar" style={{ fontSize: '11px', width: '28px', height: '28px' }}>
                                        {g.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '13.5px', fontWeight: '500' }}>{g.name}</span>
                                </div>
                            ))}
                        </div>
                        <button className="members-modal-close-btn" onClick={() => setForwardingMessage(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Telegram Group Info Modal */}
            {showGroupInfoModal && (
                <div className="create-group-modal-overlay" onClick={() => {
                    setShowGroupInfoModal(false);
                    setIsAddingMember(false);
                }}>
                    <div className="members-list-modal" style={{ width: '420px' }} onClick={(e) => e.stopPropagation()}>

                        {/* Group Profile Header */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                            <div
                                className="header-avatar"
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    fontSize: '26px',
                                    borderRadius: '18px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: activeItem.color || 'var(--active-item-border)',
                                    color: 'white'
                                }}
                            >
                                {activeItem.icon || '👥'}
                            </div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700' }}>{activeItem.name}</h3>
                            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                                {activeItem.members ? activeItem.members.length : 1} members · {
                                    activeItem.members ? activeItem.members.filter(m => USER_PROFILES[m]?.online).length : 1
                                } online
                            </p>
                        </div>

                        {/* Description & Invite Link Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                            {/* Description */}
                            <div>
                                <label className="field-label-text">Group Description</label>
                                <div style={{ fontSize: '13.5px', color: 'var(--text-main)', backgroundColor: 'var(--search-bg)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '6px', lineHeight: '1.45' }}>
                                    {activeItem.subtitle || "No description set for this group."}
                                </div>
                            </div>

                            {/* Invite Link */}
                            <div>
                                <label className="field-label-text">Invite Link</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                    <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-main)', backgroundColor: 'var(--search-bg)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {`${window.location.origin}/join/${activeId}`}
                                    </div>
                                    <button
                                        type="button"
                                        className="modal-action-button cancel-button"
                                        style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px' }}
                                        onClick={handleCopyInvite}
                                        title="Copy Link"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Members Block */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="field-label-text" style={{ margin: 0 }}>
                                    Members ({activeItem.members ? activeItem.members.length : 1})
                                </label>
                                <button
                                    type="button"
                                    style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', height: 'auto', background: 'var(--active-item-bg)', color: 'var(--active-item-border)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                    onClick={() => setIsAddingMember(!isAddingMember)}
                                >
                                    {isAddingMember ? <><X size={14} /> Close</> : <><UserPlus size={14} /> Add Member</>}
                                </button>
                            </div>

                            {/* Add Member sub-panel selector */}
                            {isAddingMember && (
                                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--search-bg)', border: '1px dashed var(--active-item-border)', borderRadius: '12px', animation: 'fadeIn 0.2s ease-out' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>
                                        SELECT USER TO ADD:
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                                        {Object.keys(USER_PROFILES)
                                            .filter(mId => !activeItem.members?.includes(mId))
                                            .map(memberId => {
                                                const user = USER_PROFILES[memberId];
                                                return (
                                                    <div
                                                        key={memberId}
                                                        className="member-selection-row"
                                                        style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            handleAddGroupMember(memberId);
                                                            setIsAddingMember(false);
                                                        }}
                                                    >
                                                        <div className="member-avatar-badge" style={{ backgroundColor: user.avatarBg, width: '28px', height: '28px', fontSize: '10px' }}>
                                                            {user.initials}
                                                        </div>
                                                        <div className="member-details-column" style={{ marginLeft: '10px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '600' }}>{user.name}</span>
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'var(--active-item-border)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Add <Plus size={12} /></span>
                                                    </div>
                                                );
                                            })}
                                        {Object.keys(USER_PROFILES).filter(mId => !activeItem.members?.includes(mId)).length === 0 && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                                                All available members are already in this group!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Scrollable Members list */}
                            <div className="members-modal-list" style={{ maxHeight: '180px' }}>
                                {activeItem.members ? activeItem.members.map(memberId => {
                                    const user = USER_PROFILES[memberId];
                                    if (!user) return null;
                                    return (
                                        <div key={memberId} className="member-selection-row" style={{ cursor: 'default', padding: '6px 10px' }}>
                                            <div className="member-avatar-badge" style={{ backgroundColor: user.avatarBg, width: '30px', height: '30px', fontSize: '10px' }}>
                                                {user.initials}
                                                <span className={`member-online-dot ${user.online ? 'online' : 'offline'}`} />
                                            </div>
                                            <div className="member-details-column" style={{ marginLeft: '10px' }}>
                                                <span className="member-row-name" style={{ fontSize: '13px' }}>{user.name}</span>
                                                <span className={`member-row-status ${user.online ? 'online-text' : ''}`} style={{ fontSize: '10.5px' }}>
                                                    {user.online ? 'online' : 'offline'}
                                                </span>
                                            </div>
                                            {(() => {
                                                const role = groupMemberRoles[`${activeId}-${memberId}`] || (memberId === 'gs' ? 'OWNER' : 'MEMBER');
                                                const myRole = groupMemberRoles[`${activeId}-gs`] || 'OWNER';
                                                const roleText = role === 'OWNER' ? 'Owner' : (role === 'ADMIN' ? 'Admin' : 'Member');
                                                const roleClass = role === 'OWNER' ? 'owner' : (role === 'ADMIN' ? 'admin' : 'member');
                                                return (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className={`member-role-badge ${roleClass}`}>
                                                            {roleText}
                                                        </span>
                                                        {myRole === 'OWNER' && memberId !== 'gs' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleAdminRole(memberId)}
                                                                style={{
                                                                    padding: '2px 6px',
                                                                    fontSize: '10px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid var(--border-color)',
                                                                    backgroundColor: role === 'ADMIN' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                                    color: role === 'ADMIN' ? '#ef4444' : '#10b981',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '600',
                                                                    marginRight: '4px'
                                                                }}
                                                            >
                                                                {role === 'ADMIN' ? 'Demote' : 'Promote'}
                                                            </button>
                                                        )}
                                                        {memberId !== 'gs' && (myRole === 'OWNER' || (myRole === 'ADMIN' && role !== 'OWNER')) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveMember(memberId)}
                                                                style={{
                                                                    padding: '2px 6px',
                                                                    fontSize: '10px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                                                    color: '#ef4444',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '600',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '2px'
                                                                }}
                                                                title="Remove Member"
                                                            >
                                                                <X size={11} /> Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                }) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No member list available.
                                    </div>
                                )}
                            </div>
                        </div>

                        <button className="members-modal-close-btn" style={{ marginTop: '10px' }} onClick={() => {
                            setShowGroupInfoModal(false);
                            setIsAddingMember(false);
                        }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Add Member / Copy Invite Link Modal */}
            <AddMember
                isOpen={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                groupName={activeItem.name}
                groupIcon={activeItem.icon || '👥'}
                groupColor={activeItem.color || 'var(--active-item-border)'}
                inviteLink={`${window.location.origin}/join/${activeId}`}
                onCopy={() => {
                    if (toastTimeoutRef.current) {
                        clearTimeout(toastTimeoutRef.current);
                    }
                    setToastMessage(`Invite link for "${activeItem.name}" copied to clipboard!`);
                    toastTimeoutRef.current = setTimeout(() => {
                        setToastMessage(null);
                    }, 3000);
                }}
            />

            {/* Telegram-style Invite Join Preview Modal */}
            {joinPreviewGroupId && (() => {
                const previewItem =
                    studyGroups.find(g => g.id === joinPreviewGroupId) ||
                    classrooms.find(c => c.id === joinPreviewGroupId);
                if (!previewItem) return null;
                const isMember = previewItem.members?.includes('gs') || previewItem.isClassroom;

                const handleJoinAction = () => {
                    if (isMember) {
                        // Enter Chat directly
                        setActiveId(joinPreviewGroupId);
                        setJoinPreviewGroupId(null);
                        if (toastTimeoutRef.current) {
                            clearTimeout(toastTimeoutRef.current);
                        }
                        setToastMessage(`Switched to "${previewItem.name}" chat room!`);
                        toastTimeoutRef.current = setTimeout(() => {
                            setToastMessage(null);
                        }, 2500);
                    } else {
                        // Send simulated join request (as requested: "if u are new to the group you request and join the group")
                        setJoinRequestState('sending');

                        setTimeout(() => {
                            setJoinRequestState('approved');

                            // Add member in state
                            setStudyGroups(prev =>
                                prev.map(g => {
                                    if (g.id === joinPreviewGroupId) {
                                        return {
                                            ...g,
                                            members: [...(g.members || []), 'gs']
                                        };
                                    }
                                    return g;
                                })
                            );

                            // Post join request system message
                            setMessagesByGroup(prev => ({
                                ...prev,
                                [joinPreviewGroupId]: [
                                    ...(prev[joinPreviewGroupId] || []),
                                    { id: `sys-joined-req-${Date.now()}`, type: 'system', text: 'Gelila Sintayehu joined the group via join request' }
                                ]
                            }));

                            // Switch after approval notification animation finishes
                            setTimeout(() => {
                                setActiveId(joinPreviewGroupId);
                                setJoinPreviewGroupId(null);
                                setJoinRequestState(null);

                                if (toastTimeoutRef.current) {
                                    clearTimeout(toastTimeoutRef.current);
                                }
                                setToastMessage(`Join request approved! Entered "${previewItem.name}" chat room.`);
                                toastTimeoutRef.current = setTimeout(() => {
                                    setToastMessage(null);
                                }, 3000);
                            }, 800);

                        }, 1500);
                    }
                };

                return (
                    <div className="create-group-modal-overlay" onClick={() => !joinRequestState && setJoinPreviewGroupId(null)}>
                        <div className="members-list-modal" style={{ width: '380px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                                <div className="header-avatar" style={{ width: '64px', height: '64px', fontSize: '24px', borderRadius: '50%', backgroundColor: previewItem.color || 'var(--active-item-border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                                    {previewItem.icon || previewItem.name.substring(0, 2).toUpperCase()}
                                </div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '19px', fontWeight: '700' }}>{previewItem.name}</h3>
                                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                                    {previewItem.members ? `${previewItem.members.length} members` : 'Classroom channel'}
                                </p>
                            </div>

                            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                                <label className="field-label-text" style={{ display: 'block', textAlign: 'center' }}>About Group</label>
                                <p style={{ fontSize: '13.5px', color: 'var(--text-main)', margin: '6px 0 0 0', lineHeight: '1.45' }}>
                                    {previewItem.subtitle || 'No description set for this group.'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button
                                    className="members-modal-close-btn"
                                    onClick={handleJoinAction}
                                    disabled={joinRequestState !== null}
                                >
                                    {isMember ? (
                                        'Enter Chat'
                                    ) : (
                                        joinRequestState === null ? 'Request to Join Group' :
                                            joinRequestState === 'sending' ? 'Sending Request... ⏳' :
                                                'Request Approved! Entering... 🎉'
                                    )}
                                </button>
                                <button
                                    className="add-member-close-btn"
                                    onClick={() => setJoinPreviewGroupId(null)}
                                    disabled={joinRequestState !== null}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Telegram File Upload Dialog Modal */}
            {showUploadOptionModal && pendingFiles.length > 0 && (
                <div className="create-group-modal-overlay" onClick={() => {
                    setShowUploadOptionModal(false);
                    setPendingFiles([]);
                }}>
                    <div className="members-list-modal" style={{ width: '380px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="members-modal-header" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 4px 0' }}>Send Files</h3>
                            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                                Select how you want to send {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* Selected files preview list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                            {pendingFiles.map((file, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: 'var(--search-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '20px', width: '34px', height: '34px', backgroundColor: 'var(--sidebar-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                        {getFileIcon(file.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                        <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                            {file.name}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                            {formatBytes(file.size)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Upload Options buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                className="members-modal-close-btn"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onClick={() => handleSendPendingFiles('document')}
                            >
                                <FileText size={16} /> Send as Documents
                            </button>

                            {pendingFiles.some(f => f.type.startsWith('image/')) && (
                                <button
                                    className="members-modal-close-btn"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#0d9488' }}
                                    onClick={() => handleSendPendingFiles('compressed')}
                                >
                                    <Image size={16} /> Send Compressed
                                </button>
                            )}

                            {pendingFiles.length > 1 && (
                                <button
                                    className="members-modal-close-btn"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#8b5cf6' }}
                                    onClick={() => handleSendPendingFiles('grouped')}
                                >
                                    <FolderArchive size={16} /> Send Grouped (As Album)
                                </button>
                            )}

                            <button
                                className="add-member-close-btn"
                                onClick={() => {
                                    setShowUploadOptionModal(false);
                                    setPendingFiles([]);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Topic Modal */}
            <Topic
                isOpen={showCreateTopicModal}
                onClose={() => setShowCreateTopicModal(false)}
                userProfiles={USER_PROFILES}
                invitedMembers={activeItem.members ? activeItem.members.filter(m => m !== 'gs') : ['at', 'yb']}
                onCreate={(topicName) => {
                    const topicId = topicName.toLowerCase().replace(/\s+/g, '-');
                    const targetGroupKey = selectedGroupIdForTopics || activeId;

                    fetch(`${API_BASE_URL}/chat/groups`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: `${targetGroupKey}-${topicId}`,
                            name: topicName,
                            description: `Topic room for ${topicName}`,
                            icon: '#',
                            color: '#0d9488',
                            memberIds: []
                        })
                    })
                    .then(res => res.json())
                    .then(group => {
                        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setTopicsByGroup(prev => {
                            const currentTopics = prev[targetGroupKey] || [];
                            if (currentTopics.some(t => t.id === topicId)) return prev;
                            return {
                                ...prev,
                                [targetGroupKey]: [
                                    ...currentTopics,
                                    { id: topicId, name: topicName, icon: topicName[0].toUpperCase(), color: '#0d9488', subtitle: 'Topic created', time: timeString }
                                ]
                            };
                        });
                        setMessagesByGroup(prev => ({
                            ...prev,
                            [`${targetGroupKey}-${topicId}`]: [
                                { id: `sys-topic-${Date.now()}`, type: 'system', text: `Topic "${topicName}" created` }
                            ]
                        }));
                        setActiveTopicId(topicId);
                        setCreatedTopicName(topicName);
                        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                        setToastMessage(`Topic "${topicName}" created!`);
                        toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2500);
                    })
                    .catch(err => console.error('Failed to persist topic:', err));
                }}
            />

            {/* Send Invitation Modal — shown after group creation confirm */}
            <SendInvitation
                isOpen={showSendInvitationModal}
                onClose={() => setShowSendInvitationModal(false)}
                topicName={createdTopicName}
                invitedMembers={activeItem.members ? activeItem.members.filter(m => m !== 'gs') : []}
                userProfiles={USER_PROFILES}
                onSend={() => {
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    setToastMessage(`Group invitations sent!`);
                    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
                }}
            />

            {/* Incoming Study Invitation Modal */}
            <StudyInvitation
                isOpen={invitationData.isOpen}
                onClose={() => setInvitationData(prev => ({ ...prev, isOpen: false }))}
                inviterName={invitationData.inviterName}
                inviterInitials={invitationData.inviterInitials}
                topicName={invitationData.topicName}
                categoryName={invitationData.categoryName}
                onJoin={() => {
                    setActiveId(invitationData.groupId);
                    setSelectedGroupIdForTopics(invitationData.groupId);
                    setActiveTopicId('general');
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    setToastMessage(`Joined study session: "${invitationData.topicName}"!`);
                    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
                }}
                onDecline={() => {
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    setToastMessage("Study invitation declined");
                    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
                }}
            />
        </div>
    );
}

export default Chat;
