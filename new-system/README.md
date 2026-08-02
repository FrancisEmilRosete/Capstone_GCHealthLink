# GCHealthLink - New System (Laravel 11 + Next.js Migration)

This folder contains the **clean-slate** target architecture.
It is completely isolated from the existing `backend/` and `frontend/` directories.

## Stack
| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | Next.js 14 (App Router, TypeScript) |
| Backend    | Laravel 11 (PHP 8.3)                |
| Database   | MySQL 8 / MariaDB 10.11             |
| Auth       | Laravel Sanctum (SPA tokens)        |
| Transport  | AES-256-GCM end-to-end encryption   |
| AI         | Native PHP via Google Gemini SDK    |

## Folders
``
new-system/
+-- backend-laravel/     # Laravel 11 API
+-- frontend-nextjs/     # Next.js 14 frontend
``

## Phase Roadmap
- [x] Phase 1 - Folder structure, AES-256-GCM layer, DB migration strategy
- [x] Phase 2 - Auth controllers, Sanctum setup, user management
- [x] Phase 3 - Core feature controllers (visits, appointments, inventory)
- [x] Phase 4 - AI / Gemini integration in PHP
- [x] Phase 5 - Clinical Forms & Doctor/Staff Portals
- [x] Phase 6 - Dental System (Charting, Queueing, Inventory)
- [x] Phase 7 - Student Portal
- [x] Phase 8 - Interactive Modules Migration (QR Scanner, AI Assistant)
- [x] Phase 9 - Admin, PWA, and Final Polish
