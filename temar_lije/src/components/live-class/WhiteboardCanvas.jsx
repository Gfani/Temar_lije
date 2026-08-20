import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Type, Trash2, Minus, Plus } from 'lucide-react';
import styles from './WhiteboardCanvas.module.css';

const COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Yellow / Amber
  '#8b5cf6', // Purple
  '#1e293b', // Dark slate
  '#ffffff', // White
];

/**
 * WhiteboardCanvas
 * HTML5 Canvas allowing real-time vector drawing and text typing,
 * broadcasting vector coordinates and text payloads via Socket.IO,
 * and rendering incoming stroke streams.
 */
export default function WhiteboardCanvas({
  socket,
  classId,
  isTeacher = false,
  readOnly = false,
}) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const textInputRef = useRef(null);

  // Tool Modes: 'pen' | 'eraser' | 'text'
  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#3b82f6');
  const [lineWeight, setLineWeight] = useState(3);

  // Floating text overlay state: { x, y, value }
  const [textOverlay, setTextOverlay] = useState(null);

  // Resize canvas to match container dimensions with crisp High-DPI resolution
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Save existing canvas image before resizing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Restore image after scaling
      ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Helper to draw a single vector line segment
  const drawSegment = useCallback((x0, y0, x1, y1, strokeColor, strokeWeight) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Helper to render typed text vector onto canvas
  const drawText = useCallback((text, x, y, textColor, fontSize) => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = textColor || '#3b82f6';
    ctx.font = `${fontSize || 20}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
    ctx.restore();
  }, []);

  // Clear local canvas
  const clearLocalCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTextOverlay(null);
  }, []);

  // Socket event listeners for incoming stroke/text vectors & sync history
  useEffect(() => {
    if (!socket) return;

    // Receive single stroke vector or text payload from teacher/peer
    const handleReceiveStroke = (data) => {
      const normalizedClassId = String(classId || '');
      if (data?.classId && String(data.classId) !== normalizedClassId) return;

      const stroke = data?.stroke;

      // Object text payload
      if (
        data?.type === 'text' ||
        (stroke && typeof stroke === 'object' && !Array.isArray(stroke) && stroke.type === 'text')
      ) {
        const payload = stroke || data;
        drawText(payload.text, payload.x, payload.y, payload.color, payload.fontSize);
        return;
      }

      // Tuple vector stroke [x0, y0, x1, y1, color, lineWeight]
      const tuple = Array.isArray(stroke)
        ? stroke
        : [
            data?.x0 ?? data?.prevX,
            data?.y0 ?? data?.prevY,
            data?.x1 ?? data?.x,
            data?.y1 ?? data?.y,
            data?.color || '#3b82f6',
            data?.lineWeight || 3,
          ];

      if (Array.isArray(tuple) && tuple.length >= 6) {
        drawSegment(tuple[0], tuple[1], tuple[2], tuple[3], tuple[4], tuple[5]);
      }
    };

    // Receive explicit text payload event
    const handleReceiveText = (data) => {
      const normalizedClassId = String(classId || '');
      if (data?.classId && String(data.classId) !== normalizedClassId) return;
      if (data?.text) {
        drawText(data.text, data.x, data.y, data.color, data.fontSize);
      }
    };

    // Receive board clear command
    const handleReceiveClear = (data) => {
      const normalizedClassId = String(classId || '');
      if (data?.classId && String(data.classId) !== normalizedClassId) return;
      clearLocalCanvas();
    };

    // Receive full stroke vector history when joining or reconnecting
    const handleSyncHistory = (data) => {
      const normalizedClassId = String(classId || '');
      if (data?.classId && String(data.classId) !== normalizedClassId) return;
      clearLocalCanvas();
      const strokes = data?.strokes || [];
      strokes.forEach((item) => {
        if (Array.isArray(item) && item.length >= 6) {
          drawSegment(item[0], item[1], item[2], item[3], item[4], item[5]);
        } else if (item && typeof item === 'object' && item.type === 'text') {
          drawText(item.text, item.x, item.y, item.color, item.fontSize);
        }
      });
    };

    socket.on('receiveWhiteboardStroke', handleReceiveStroke);
    socket.on('receiveWhiteboardText', handleReceiveText);
    socket.on('receiveClearWhiteboard', handleReceiveClear);
    socket.on('syncWhiteboardHistory', handleSyncHistory);

    // Join room explicitly to fetch initial history
    socket.emit('joinRoom', { classId: String(classId || '') });

    return () => {
      socket.off('receiveWhiteboardStroke', handleReceiveStroke);
      socket.off('receiveWhiteboardText', handleReceiveText);
      socket.off('receiveClearWhiteboard', handleReceiveClear);
      socket.off('syncWhiteboardHistory', handleSyncHistory);
    };
  }, [socket, classId, drawSegment, drawText, clearLocalCanvas]);

  // Coordinate retrieval helper for mouse / touch events
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStartDrawing = (e) => {
    if (readOnly || (!isTeacher && readOnly)) return;

    const coords = getCanvasCoords(e);

    // If Text mode is selected, spawn floating input overlay at click position
    if (activeTool === 'text') {
      // If an existing overlay is open, submit it first
      if (textOverlay && textOverlay.value.trim()) {
        submitTypedText(textOverlay.value, textOverlay.x, textOverlay.y);
      }
      setTextOverlay({ x: coords.x, y: coords.y, value: '' });
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 50);
      return;
    }

    isDrawingRef.current = true;
    lastPosRef.current = coords;
  };

  const handleDraw = (e) => {
    if (!isDrawingRef.current || readOnly || activeTool === 'text') return;
    const coords = getCanvasCoords(e);
    const prev = lastPosRef.current;

    const isEraser = activeTool === 'eraser';
    const currentStrokeColor = isEraser ? '#ffffff' : color;
    const currentWeight = isEraser ? lineWeight * 3 : lineWeight;

    // Draw locally immediately for instantaneous feedback
    drawSegment(prev.x, prev.y, coords.x, coords.y, currentStrokeColor, currentWeight);

    // Emit vector coordinates tuple [x0, y0, x1, y1, color, lineWeight] to Socket Gateway
    const strokeVector = [prev.x, prev.y, coords.x, coords.y, currentStrokeColor, currentWeight];
    if (socket && socket.connected) {
      socket.emit('sendWhiteboardStroke', {
        classId: String(classId || ''),
        stroke: strokeVector,
        x0: prev.x,
        y0: prev.y,
        x1: coords.x,
        y1: coords.y,
        color: currentStrokeColor,
        lineWeight: currentWeight,
      });
    }

    lastPosRef.current = coords;
  };

  const handleStopDrawing = () => {
    isDrawingRef.current = false;
  };

  // Submit typed text to canvas & broadcast via WebSockets
  const submitTypedText = (typedText, x, y) => {
    const textValue = (typedText || '').trim();
    if (textValue) {
      const calculatedFontSize = Math.max(16, lineWeight * 4);

      // Render text on local canvas
      drawText(textValue, x, y, color, calculatedFontSize);

      const textPayload = {
        type: 'text',
        text: textValue,
        x,
        y,
        color,
        fontSize: calculatedFontSize,
        classId: String(classId || ''),
      };

      // Emit text vector via Socket Gateway
      if (socket && socket.connected) {
        socket.emit('sendWhiteboardText', textPayload);
        socket.emit('sendWhiteboardStroke', {
          classId: String(classId || ''),
          stroke: textPayload,
        });
      }
    }
    setTextOverlay(null);
  };

  const handleTextOverlayKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (textOverlay) {
        submitTypedText(textOverlay.value, textOverlay.x, textOverlay.y);
      }
    } else if (e.key === 'Escape') {
      setTextOverlay(null);
    }
  };

  const handleTextOverlayBlur = () => {
    if (textOverlay) {
      submitTypedText(textOverlay.value, textOverlay.x, textOverlay.y);
    }
  };

  const handleClearBoard = () => {
    clearLocalCanvas();
    if (socket && socket.connected) {
      socket.emit('clearWhiteboard', { classId: String(classId || '') });
    }
  };

  return (
    <div className={styles.whiteboardContainer}>
      {/* Teacher Control Toolbar */}
      {isTeacher && !readOnly && (
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              className={`${styles.toolButton} ${activeTool === 'pen' ? styles.activeTool : ''}`}
              onClick={() => {
                setActiveTool('pen');
                setTextOverlay(null);
              }}
              title="Pen tool"
            >
              <Pencil className={styles.icon} />
            </button>
            <button
              type="button"
              className={`${styles.toolButton} ${activeTool === 'text' ? styles.activeTool : ''}`}
              onClick={() => {
                setActiveTool('text');
              }}
              title="Text typing tool (Click canvas to type)"
            >
              <Type className={styles.icon} />
            </button>
            <button
              type="button"
              className={`${styles.toolButton} ${activeTool === 'eraser' ? styles.activeTool : ''}`}
              onClick={() => {
                setActiveTool('eraser');
                setTextOverlay(null);
              }}
              title="Eraser tool"
            >
              <Eraser className={styles.icon} />
            </button>
          </div>

          <div className={styles.divider} />

          {/* Color Palette */}
          {activeTool !== 'eraser' && (
            <div className={styles.colorPalette}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorSwatch} ${color === c ? styles.selectedSwatch : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={`Color ${c}`}
                />
              ))}
            </div>
          )}

          <div className={styles.divider} />

          {/* Line Weight / Font Size Selector */}
          <div className={styles.strokeSelector}>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => setLineWeight((prev) => Math.max(1, prev - 1))}
              disabled={lineWeight <= 1}
              title="Decrease stroke / font size"
            >
              <Minus className={styles.iconSmall} />
            </button>
            <span className={styles.weightLabel}>
              {activeTool === 'text' ? `${Math.max(16, lineWeight * 4)}px` : `${lineWeight}px`}
            </span>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => setLineWeight((prev) => Math.min(20, prev + 1))}
              disabled={lineWeight >= 20}
              title="Increase stroke / font size"
            >
              <Plus className={styles.iconSmall} />
            </button>
          </div>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClearBoard}
            title="Clear entire canvas"
          >
            <Trash2 className={styles.icon} />
            <span>Clear Canvas</span>
          </button>
        </div>
      )}

      {/* HTML5 Interactive Canvas with Floating Input Overlay */}
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={handleStartDrawing}
          onMouseMove={handleDraw}
          onMouseUp={handleStopDrawing}
          onMouseLeave={handleStopDrawing}
          onTouchStart={handleStartDrawing}
          onTouchMove={handleDraw}
          onTouchEnd={handleStopDrawing}
        />

        {/* Floating Text Overlay Input when Text Tool is Active */}
        {textOverlay && (
          <input
            ref={textInputRef}
            type="text"
            className={styles.textOverlayInput}
            value={textOverlay.value}
            onChange={(e) => setTextOverlay({ ...textOverlay, value: e.target.value })}
            onKeyDown={handleTextOverlayKeyDown}
            onBlur={handleTextOverlayBlur}
            placeholder="Type text & hit Enter..."
            style={{
              left: `${textOverlay.x}px`,
              top: `${textOverlay.y}px`,
              color: color,
              fontSize: `${Math.max(16, lineWeight * 4)}px`,
            }}
          />
        )}

        {readOnly && (
          <div className={styles.readOnlyBadge}>
            <span>Teacher Interactive Canvas (Read Only)</span>
          </div>
        )}
      </div>
    </div>
  );
}

