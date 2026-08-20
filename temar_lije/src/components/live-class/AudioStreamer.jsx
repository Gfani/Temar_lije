import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, Activity } from 'lucide-react';
import styles from './AudioStreamer.module.css';

/**
 * AudioStreamer
 * Teacher audio recorder (MediaRecorder API emitting low-bandwidth socket buffers)
 * and Student audio player (Web Audio API / Audio Element stream decoder for offline fallback mode).
 */
export default function AudioStreamer({
  socket,
  classId,
  isTeacher = false,
  currentUser = { name: 'User' },
}) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isReceivingAudio, setIsReceivingAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingQueueRef = useRef(false);
  const receivingTimerRef = useRef(null);

  // Initialize Web Audio Context on user interaction for student audio playback
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play audio chunk from queue
  const playNextAudioChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      return;
    }

    isPlayingQueueRef.current = true;
    const chunkData = audioQueueRef.current.shift();

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      let arrayBuffer;
      if (chunkData instanceof ArrayBuffer) {
        arrayBuffer = chunkData;
      } else if (typeof chunkData === 'string' && chunkData.startsWith('data:audio')) {
        const base64 = chunkData.split(',')[1];
        const binaryStr = window.atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else if (chunkData?.data) {
        arrayBuffer = chunkData.data;
      }

      if (arrayBuffer) {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          playNextAudioChunk();
        };
        source.start(0);
      } else {
        playNextAudioChunk();
      }
    } catch (err) {
      // Fallback HTML5 audio element for blob URLs
      if (typeof chunkData === 'string' && chunkData.startsWith('blob:')) {
        const audioEl = new Audio(chunkData);
        audioEl.onended = () => playNextAudioChunk();
        audioEl.play().catch(() => playNextAudioChunk());
      } else {
        playNextAudioChunk();
      }
    }
  }, [getAudioContext]);

  // Student mode: Receive live audio chunks over WebSocket
  useEffect(() => {
    if (isTeacher || !socket) return;

    const handleReceiveAudioChunk = (data) => {
      if (data?.classId && data.classId !== classId) return;
      if (isAudioMuted) return;

      setIsReceivingAudio(true);
      if (receivingTimerRef.current) clearTimeout(receivingTimerRef.current);
      receivingTimerRef.current = setTimeout(() => {
        setIsReceivingAudio(false);
      }, 3000);

      const chunk = data?.audioChunk;
      if (chunk) {
        audioQueueRef.current.push(chunk);
        if (!isPlayingQueueRef.current) {
          playNextAudioChunk();
        }
      }
    };

    socket.on('receiveAudioChunk', handleReceiveAudioChunk);

    return () => {
      socket.off('receiveAudioChunk', handleReceiveAudioChunk);
      if (receivingTimerRef.current) clearTimeout(receivingTimerRef.current);
    };
  }, [socket, classId, isTeacher, isAudioMuted, playNextAudioChunk]);

  // Teacher mode: Start recording audio from microphone
  const startTeacherRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono audio for minimal network bandwidth
          sampleRate: 24000,
        },
      });

      audioStreamRef.current = stream;

      // Microphone volume meter visualizer
      const ctx = getAudioContext();
      if (ctx) {
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!audioStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          requestAnimationFrame(updateVolume);
        };
        updateVolume();
      }

      // MediaRecorder set up for 250ms chunks to stream low-latency voice data
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else {
          mimeType = '';
        }
      }

      const recorderOptions = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0 && socket && socket.connected) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result;
            socket.emit('streamAudioChunk', {
              classId,
              audioChunk: base64Data,
              senderId: currentUser?.id || 'teacher',
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Record in 250ms time slices for minimal latency
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsMicOn(true);
    } catch (err) {
      console.error('Could not access microphone for live audio stream:', err);
      alert('Microphone access permission denied or unavailable.');
    }
  };

  // Teacher mode: Stop recording audio
  const stopTeacherRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsMicOn(false);
    setAudioLevel(0);
  };

  const toggleTeacherMic = () => {
    if (isMicOn) {
      stopTeacherRecording();
    } else {
      startTeacherRecording();
    }
  };

  useEffect(() => {
    return () => {
      stopTeacherRecording();
    };
  }, []);

  return (
    <div className={styles.audioContainer}>
      {isTeacher ? (
        // Teacher View: Mic Controls & Audio Level Meter
        <div className={styles.controlsRow}>
          <button
            type="button"
            className={`${styles.micButton} ${isMicOn ? styles.micActive : ''}`}
            onClick={toggleTeacherMic}
          >
            {isMicOn ? <Mic className={styles.icon} /> : <MicOff className={styles.icon} />}
            <span>{isMicOn ? 'Voice Broadcasting (Live)' : 'Start Voice Broadcast'}</span>
          </button>

          {isMicOn && (
            <div className={styles.levelMeter}>
              <Activity className={styles.activityIcon} />
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className={styles.levelPercent}>{audioLevel}%</span>
            </div>
          )}
        </div>
      ) : (
        // Student View: Audio Receiving Indicator & Mute Toggle
        <div className={styles.controlsRow}>
          <div className={styles.statusIndicator}>
            {isReceivingAudio ? (
              <>
                <Radio className={`${styles.liveRadio} animate-pulse`} />
                <span className={styles.liveText}>Receiving Teacher Voice Stream</span>
              </>
            ) : (
              <>
                <Volume2 className={styles.iconMuted} />
                <span className={styles.idleText}>Voice Channel Ready (Waiting for Teacher)</span>
              </>
            )}
          </div>

          <button
            type="button"
            className={styles.toggleAudioBtn}
            onClick={() => setIsAudioMuted((prev) => !prev)}
            title={isAudioMuted ? 'Unmute voice channel' : 'Mute voice channel'}
          >
            {isAudioMuted ? <VolumeX className={styles.icon} /> : <Volume2 className={styles.icon} />}
            <span>{isAudioMuted ? 'Muted' : 'Sound On'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
