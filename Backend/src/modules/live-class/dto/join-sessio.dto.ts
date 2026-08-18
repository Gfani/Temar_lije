/**
 * DTO for joining a live class session and transmitting whiteboard strokes.
 */
export class JoinSessionDto {
  classId;
  userId;
  role;
}

/**
 * DTO for whiteboard stroke events.
 */
export class WhiteboardStrokeDto {
  classId;
  x;
  y;
  prevX;
  prevY;
  color;
}
