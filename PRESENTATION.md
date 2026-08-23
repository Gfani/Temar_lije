# 🎓 Temar Lije (ተማር ልጅ)
## Real-Time Collaborative Learning Platform & Cloud Infrastructure
### Final Project Presentation

**Presenter / Role:** DevOps & Real-Time Systems Engineer  
**Live Application:** [https://temar-lije.southafricanorth.cloudapp.azure.com](https://temar-lije.southafricanorth.cloudapp.azure.com)  
**Repository:** [https://github.com/gelila0913/Temar_Lije](https://github.com/gelila0913/Temar_Lije) (Branch: `Fani`)

---

## 📋 Slide Overview

1. **Slide 1:** Title & Project Overview
2. **Slide 2:** My Primary Role & Technical Scope
3. **Slide 3:** Real-Time Chat & Collaboration Architecture
4. **Slide 4:** Privacy, Security & RBAC Isolation
5. **Slide 5:** DevOps & Cloud Infrastructure (Docker & Azure)
6. **Slide 6:** Production Nginx, Reverse Proxy & SSL Encryption
7. **Slide 7:** Backend TypeScript Migration & Code Reliability
8. **Slide 8:** Mobile Responsiveness & UI/UX Overhaul
9. **Slide 9:** Key Technical Challenges Solved
10. **Slide 10:** Live Demonstration & Conclusion

---

## 🖥️ Slide 1: Project Overview — What is Temar Lije?
* **Problem Statement:** Students and teachers need a unified, modern, real-time virtual classroom system with live interactive study groups, assessments, and voice messaging.
* **Solution:** **Temar Lije** — A scalable, full-stack educational ecosystem featuring:
  - Virtual Classrooms with material distribution & assignments
  - Real-Time peer study groups with instant messaging & voice notes
  - Interactive quiz engine with real-time countdown & auto-grading
  - Live video/audio study buddy rooms with instant notifications

---

## 🖥️ Slide 2: My Core Contributions & Role
As the **DevOps & Real-Time Systems Engineer**, I was responsible for:
1. **Real-Time Communication:** Architecting the Socket.io WebSocket engine, voice note recorder, and room subscription logic.
2. **DevOps & Cloud Architecture:** Containerizing the stack with Docker Compose and deploying it to a Microsoft Azure Linux VM with Let's Encrypt HTTPS/TLS certificates.
3. **Privacy & Access Control:** Engineering database-level RBAC rules ensuring complete separation between teachers and private student peer groups.
4. **Backend TypeScript Migration:** Migrating the legacy NestJS backend to 100% strongly-typed TypeScript.
5. **Mobile Responsiveness:** Resolving critical mobile layout breaking issues in the Members & Study Groups views.

---

## 🖥️ Slide 3: Real-Time Chat System Architecture
* **Technology Stack:** NestJS WebSocket Gateway (`@nestjs/websockets`), Socket.io, Web Audio API, PostgreSQL.
* **Key Capabilities:**
  - **Zero-Latency Messaging:** Bidirectional socket broadcasts (`newMessage`) correlated by `groupId`.
  - **Built-in Voice Notes:** Custom browser `MediaRecorder` integration allowing students to record and stream audio (`.webm` / `.mp3`).
  - **Presence & Status:** Real-time green-dot online presence indicators and typing feedback.
  - **Threaded Topics:** Telegram-style persistent sub-topics within study groups.

```
+------------------+        WebSocket (Socket.io)       +---------------------+
|  React Frontend  | <================================> |  NestJS ChatGateway |
|  (chat.jsx)      |                                    |  (chat.gateway.ts)  |
+------------------+                                    +---------------------+
        |                                                          |
        | REST Uploads (Multipart/Audio)                           | Prisma ORM
        v                                                          v
+------------------+                                    +---------------------+
|  Nginx /uploads  |                                    |  PostgreSQL 16 DB   |
+------------------+                                    +---------------------+
```

---

## 🖥️ Slide 4: Privacy, Security & RBAC Isolation
* **Student Peer Group Confidentiality:**
  - Configured `ChatService.getGroups` so non-members cannot discover or query private groups.
  - **Strict Teacher Boundary:** Teachers (`role === 'TEACHER'`) are explicitly restricted from viewing or joining student study groups, protecting student discussion privacy.
* **Socket Room Guarding:** Every `joinRoom` and `sendMessage` event enforces token verification and membership validation before broadcasting (`403 Forbidden`).
* **Lifecycle Authority:**
  - Teachers can delete classrooms with complete database cascading cleanup.
  - Teachers can remove students, completely revoking their accounts.

---

## 🖥️ Slide 5: DevOps & Azure Cloud Infrastructure
* **Multi-Container Docker Architecture:**
  - **`temar_db`**: PostgreSQL 16 Alpine with persistent named volumes (`pgdata`) and auto-seeding (`01_init.sql`).
  - **`temar_backend`**: Node.js 20 Alpine running NestJS production build on port 3000.
  - **`temar_frontend`**: Multi-stage build (Vite SPA compiled -> Nginx Alpine production image on ports 80/443).
* **Cloud VM:** Hosted on Microsoft Azure Linux VM (`172.209.217.233`).
* **Healthchecks & Resilience:** `db` healthcheck ensures database readiness before backend startup; container restart policies guarantee 99.9% uptime.

---

## 🖥️ Slide 6: Production Nginx, Reverse Proxy & SSL
* **SSL / TLS Termination:** Automated Let's Encrypt certificates with TLSv1.2/v1.3 and automatic HTTP-to-HTTPS redirect (`301 Moved Permanently`).
* **Unified Domain Routing:**
  - `/` ➔ React SPA with client-side routing (`try_files $uri $uri/ /index.html`).
  - `/api/` ➔ Reverse proxied to NestJS Backend container (`http://backend:3000/`).
  - `/socket.io/` ➔ WebSocket connection upgrade with `86400s` keep-alive.
  - `/uploads/` ➔ Streaming static media and audio voice messages.

---

## 🖥️ Slide 7: Backend TypeScript Migration
* **The Challenge:** Legacy backend codebase had inconsistent JavaScript files, unvalidated payloads, and build-breaking runtime errors.
* **The Solution:**
  - Converted 100% of Controllers, Services, Gateways, DTOs, and Guards to TypeScript.
  - Added strict class validation with `class-validator` and `ValidationPipe`.
  - Achieved **0 compilation errors** on `nest build`.

---

## 🖥️ Slide 8: Mobile Responsiveness & UI/UX Overhaul
* **The Problem:** Members and Study Groups sidebars were overlapping roster cards on mobile viewports.
* **The Fix:**
  - Implemented responsive mobile pill navigation: `[👥 Members]` & `[📚 Study Groups]`.
  - Added full responsive CSS breakpoints (`@media (max-width: 768px)`).
  - Built student onboarding flow with optional classroom code auto-enrollment.
  - Integrated Light / Dark mode switching across the entire UI.

---

## 🖥️ Slide 9: Key Technical Challenges Solved

| Challenge | Root Cause | Solution Implemented |
| :--- | :--- | :--- |
| **WebSocket Connection Drops** | Reverse proxy closing long-lived TCP connections | Added `Upgrade` headers and extended `proxy_read_timeout 86400s` in Nginx. |
| **Teacher Group Infiltration** | Flat study group queries returning all records | Added database-level `members: { some: { userId } }` and teacher exclusion checks. |
| **Mobile Roster Overlap** | Fixed desktop widths in CSS grid | Rebuilt tab navigation with responsive pills and dynamic viewport layouts. |
| **Cloud Deployment SSL** | Missing certificates on fresh host | Automated Certbot standalone certificate generation and container volume mounts. |

---

## 🖥️ Slide 10: Live Production Demo & Conclusion

### 🌐 **Live URLs:**
* **Production App:** [https://temar-lije.southafricanorth.cloudapp.azure.com](https://temar-lije.southafricanorth.cloudapp.azure.com)
* **Custom Domain:** [https://temarlije.mooo.com](https://temarlije.mooo.com)

### 🏆 **Key Takeaways:**
* Built a secure, real-time, privacy-first classroom platform.
* Successfully architected, containerized, and deployed the full stack to Microsoft Azure with 100% HTTPS encryption.
* Created a seamless, mobile-ready user experience for both teachers and students.

**Thank you! Questions & Live Demo.**
