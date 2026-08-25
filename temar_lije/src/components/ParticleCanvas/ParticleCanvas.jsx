import React, { useEffect, useRef } from 'react';
import './ParticleCanvas.css';

/**
 * 3D Interactive Particle Constellation & Connected Mesh Canvas
 * Pure 60fps hardware-accelerated 3D projection engine with mouse magnetism
 */
export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates in normalized 3D space
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      radius: 180,
    };

    // Color palette matching Temar Lije branding
    const colors = [
      'rgba(13, 148, 136, ', // Teal
      'rgba(79, 70, 229, ',  // Indigo
      'rgba(56, 189, 248, ', // Sky Cyan
      'rgba(139, 92, 246, ', // Purple
      'rgba(16, 185, 129, ', // Emerald
    ];

    const particleCount = Math.min(Math.floor((width * height) / 14000), 75);
    const particles = [];
    const fov = 350;

    class Particle3D {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = (Math.random() - 0.5) * width * 1.2;
        this.y = (Math.random() - 0.5) * height * 1.2;
        this.z = init ? Math.random() * 400 - 200 : 200;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.vz = (Math.random() - 0.5) * 0.35;
        this.baseRadius = Math.random() * 2.2 + 1.2;
        this.colorPrefix = colors[Math.floor(Math.random() * colors.length)];
        this.pulse = Math.random() * Math.PI * 2;
      }

      update(rotX, rotY) {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;
        this.pulse += 0.03;

        // Boundaries wrapping
        if (this.x < -width * 0.7) this.x = width * 0.7;
        if (this.x > width * 0.7) this.x = -width * 0.7;
        if (this.y < -height * 0.7) this.y = height * 0.7;
        if (this.y > height * 0.7) this.y = -height * 0.7;
        if (this.z < -200) this.z = 200;
        if (this.z > 200) this.z = -200;

        // 3D Rotation Matrix around Y and X axis based on mouse
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        // Rotate Y
        let rx = this.x * cosY - this.z * sinY;
        let rz = this.z * cosY + this.x * sinY;

        // Rotate X
        let ry = this.y * cosX - rz * sinX;
        rz = rz * cosX + this.y * sinX;

        // Perspective Projection
        const scale = fov / (fov + rz + 250);
        this.projX = rx * scale + width / 2;
        this.projY = ry * scale + height / 2;
        this.projScale = scale;
        this.depthAlpha = Math.max(0.15, Math.min(0.85, (rz + 200) / 400));
      }

      draw() {
        if (this.projScale <= 0) return;
        const currentRadius = (this.baseRadius + Math.sin(this.pulse) * 0.5) * this.projScale;

        // Glow halo
        const gradient = ctx.createRadialGradient(
          this.projX, this.projY, 0,
          this.projX, this.projY, currentRadius * 3.5
        );
        gradient.addColorStop(0, `${this.colorPrefix}${this.depthAlpha})`);
        gradient.addColorStop(1, `${this.colorPrefix}0)`);

        ctx.beginPath();
        ctx.arc(this.projX, this.projY, currentRadius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(this.projX, this.projY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${this.colorPrefix}${this.depthAlpha + 0.15})`;
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle3D());
    }

    // Event listeners
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.targetX = ((e.clientX / width) - 0.5) * 0.35;
      mouse.targetY = ((e.clientY / height) - 0.5) * 0.35;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let currentRotX = 0;
    let currentRotY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth camera interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      currentRotY += 0.0015 + mouse.x * 0.05;
      currentRotX = mouse.y * 0.25;

      // Update all particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(currentRotX, currentRotY);
      }

      // Draw connection lines between nearby 3D points
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].projX - particles[j].projX;
          const dy = particles[i].projY - particles[j].projY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 130 * Math.min(particles[i].projScale, particles[j].projScale);

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.25 * particles[i].depthAlpha;
            ctx.beginPath();
            ctx.moveTo(particles[i].projX, particles[i].projY);
            ctx.lineTo(particles[j].projX, particles[j].projY);
            ctx.strokeStyle = `rgba(13, 148, 136, ${lineAlpha})`;
            ctx.lineWidth = 1 * particles[i].projScale;
            ctx.stroke();
          }
        }
      }

      // Draw particle nodes
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-3d-canvas" />;
}
