import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Palette, Minus, Plus } from 'lucide-react';
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
 * HTML5 Canvas allowing real-time vector drawing, broadcasting vector coordinates
 * [x0, y0, x1, y1, color, lineWeight] via Socket.IO, and rendering incoming stroke streams.
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

  const [color, setColor] = useState('#3b82f6');
  const [lineWeight, setLineWeight] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

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

  // Clear local canvas
  const clearLocalCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Socket event listeners for incoming vectors & sync history
  useEffect(() => {
    if (!socket) return;

    // Receive single stroke vector from teacher/peer
    const handleReceiveStroke = (data) => {
      if (data?.classId && data.classId !== classId) return;
      const stroke = data?.stroke || [
        data?.x0 ?? data?.prevX,
        data?.y0 ?? data?.prevY,
        data?.x1 ?? data?.x,
        data?.y1 ?? data?.y,
        data?.color || '#3b82f6',
        data?.lineWeight || 3,
      ];
      if (Array.isArray(stroke) && stroke.length >= 6) {
        drawSegment(stroke[0], stroke[1], stroke[2], stroke[3], stroke[4], stroke[5]);
      }
    };

    // Receive board clear command
    const handleReceiveClear = (data) => {
      if (data?.classId && data.classId !== classId) return;
      clearLocalCanvas();
    };

    // Receive full stroke vector history when joining or reconnecting
    const handleSyncHistory = (data) => {
      if (data?.classId && data.classId !== classId) return;
      clearLocalCanvas();
      const strokes = data?.strokes || [];
      strokes.forEach((stroke) => {
        if (Array.isArray(stroke) && stroke.length >= 6) {
          drawSegment(stroke[0], stroke[1], stroke[2], stroke[3], stroke[4], stroke[5]);
        }
      });
    };

    socket.on('receiveWhiteboardStroke', handleReceiveStroke);
    socket.on('receiveClearWhiteboard', handleReceiveClear);
    socket.on('syncWhiteboardHistory', handleSyncHistory);

    // Join room explicitly to fetch initial history
    socket.emit('joinRoom', { classId });

    return () => {
      socket.off('receiveWhiteboardStroke', handleReceiveStroke);
      socket.off('receiveClearWhiteboard', handleReceiveClear);
      socket.off('syncWhiteboardHistory', handleSyncHistory);
    };
  }, [socket, classId, drawSegment, clearLocalCanvas]);

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
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPosRef.current = coords;
  };

  const handleDraw = (e) => {
    if (!isDrawingRef.current || readOnly) return;
    const coords = getCanvasCoords(e);
    const prev = lastPosRef.current;

    const currentStrokeColor = isEraser ? '#ffffff' : color;
    const currentWeight = isEraser ? lineWeight * 3 : lineWeight;

    // Draw locally immediately for instantaneous feedback
    drawSegment(prev.x, prev.y, coords.x, coords.y, currentStrokeColor, currentWeight);

    // Emit vector coordinates tuple [x0, y0, x1, y1, color, lineWeight] to Socket Gateway
    const strokeVector = [prev.x, prev.y, coords.x, coords.y, currentStrokeColor, currentWeight];
    if (socket && socket.connected) {
      socket.emit('sendWhiteboardStroke', {
        classId,
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

  const handleClearBoard = () => {
    clearLocalCanvas();
    if (socket && socket.connected) {
      socket.emit('clearWhiteboard', { classId });
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
              className={`${styles.toolButton} ${!isEraser ? styles.activeTool : ''}`}
              onClick={() => setIsEraser(false)}
              title="Pen tool"
            >
              <Pencil className={styles.icon} />
            </button>
            <button
              type="button"
              className={`${styles.toolButton} ${isEraser ? styles.activeTool : ''}`}
              onClick={() => setIsEraser(true)}
              title="Eraser tool"
            >
              <Eraser className={styles.icon} />
            </button>
          </div>

          <div className={styles.divider} />

          {/* Color Palette */}
          {!isEraser && (
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

          {/* Line Weight Selector */}
          <div className={styles.strokeSelector}>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => setLineWeight((prev) => Math.max(1, prev - 1))}
              disabled={lineWeight <= 1}
              title="Decrease stroke"
            >
              <Minus className={styles.iconSmall} />
            </button>
            <span className={styles.weightLabel}>{lineWeight}px</span>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => setLineWeight((prev) => Math.min(20, prev + 1))}
              disabled={lineWeight >= 20}
              title="Increase stroke"
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

      {/* HTML5 Interactive Canvas */}
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

        {readOnly && (
          <div className={styles.readOnlyBadge}>
            <span>Teacher Interactive Canvas (Read Only)</span>
          </div>
        )}
      </div>
    </div>
  );
}
