# GC HealthLink

**Gordon College Health Services Unit — Digital Clinic Management System**

GC HealthLink is a full-stack web application built for the Gordon College Health Services Unit (Olongapo City, Philippines). It digitises day-to-day clinic operations — from student health records and appointment scheduling to medicine inventory tracking — and layers on AI-powered predictive analytics so clinic staff can anticipate outbreaks and supply shortages before they happen.

The system serves **five user roles** through role-based dashboards:

| Role | Key Capabilities |
|------|-----------------|
| **Admin** | User management, system-wide analytics, audit logs, settings |
| **Doctor** | Patient records, physical examinations, medical conditions checklist, consultations, medical certificates, reports, AI assistant |
| **Nurse / Staff** | Clinic visits, QR-based student scanning, appointment queue, inventory management, health advisories, reports |
| **Dentist** | Dental queue, dental records, inventory, reports |
| **Student** | Personal health record, consultation requests, appointment booking, medical certificates, in-app messaging |

### Core Features

- 🏥 **Electronic Health Records** — Medical history, physical examinations, lab results, and document uploads per student
- 📅 **Appointment Scheduling** — Configurable availability slots with queue management
- 💊 **Inventory & Dispensing** — Batch-tracked medicine inventory with auto-deduction on dispensing
- 📊 **Analytics Dashboard** — Illness trends, top health concerns, and visit statistics with interactive charts
- 🤖 **AI Assistant** — Google Gemini-powered health insights, smart reminders, and outbreak forecasting
- 📈 **Predictive Analytics** — ML-based outbreak trend forecasting and resource depletion prediction (Python microservice)
- 📱 **Progressive Web App** — Installable on mobile devices with offline fallback page
- 🔐 **AES-256-GCM Transport Encryption** — End-to-end payload encryption between frontend and backend
- 💬 **In-App Messaging** — Role-based messaging between students and clinic staff
- 📄 **Report Generation** — PDF export of clinic visit logs, health statistics, and inventory reports
- 📷 **QR Code Authentication** — Staff can scan student QR codes for quick record lookup
- 📋 **Audit Logging** — Complete activity trail for compliance and accountability

---

## Tech Stack

### Frontend (`frontend/`)

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Icons | Lucide React |
| PDF Generation | jsPDF + jspdf-autotable |
| QR Scanning | html5-qrcode |
| PWA | next-pwa |
| Notifications | react-hot-toast |

### Backend (`new-system/backend-laravel/`)

| Category | Technology |
|----------|-----------|
| Framework | Laravel 11 |
| Language | PHP 8.2+ |
| Authentication | Laravel Sanctum (SPA cookie-based) |
| AI Integration | google-gemini-php/laravel |
| Database | MySQL / MariaDB (configurable) |
| ORM | Eloquent (ULIDs for primary keys) |
| Testing | PHPUnit 11 |
| Dev Tools | Laravel Pail (real-time logs), Pint (code style) |

### AI Predictive Service (`ai-service-python/`)

| Category | Technology |
|----------|-----------|
| Framework | FastAPI |
| Language | Python 3.11+ |
| ML | scikit-learn (Linear Regression) |
| Data Processing | pandas, NumPy |
| Server | Uvicorn / Gunicorn |

---

## Repository Structure

```
Capstone_GCHealthLink/
│
├── frontend/                        # Next.js 16 SPA (TypeScript)
│   ├── app/                         # App Router pages & layouts
│   │   ├── (auth)/                  #   Login page
│   │   ├── dashboard/               #   Role-based dashboards
│   │   │   ├── admin/               #     Admin: analytics, users, inventory, audit
│   │   │   ├── doctor/              #     Doctor: records, exams, consultations, AI
│   │   │   ├── staff/               #     Nurse: visits, queue, scanner, inventory
│   │   │   ├── dental/              #     Dentist: queue, records, inventory
│   │   │   └── student/             #     Student: health record, appointments, messaging
│   │   └── doctor/records/          #   Doctor patient records view
│   ├── components/                  # Reusable UI components
│   │   ├── ui/                      #   Base components (Button, Card, etc.)
│   │   ├── dashboard/               #   Dashboard-specific widgets
│   │   ├── messaging/               #   In-app messaging components
│   │   ├── scanner/                 #   QR code scanner
│   │   └── modals/                  #   Modal dialogs
│   ├── lib/                         # API client, utilities, AES encryption
│   ├── constants/                   # App-wide constants
│   ├── types/                       # TypeScript type definitions
│   └── public/                      # Static assets, PWA manifest, icons
│
├── new-system/
│   └── backend-laravel/             # Laravel 11 REST API
│       ├── app/
│       │   ├── Http/Controllers/    #   19 API controllers
│       │   ├── Http/Middleware/      #   AES encryption middleware
│       │   └── Models/              #   15 Eloquent models
│       ├── config/                  # App, AES, CORS, Sanctum config
│       ├── database/
│       │   ├── migrations/          #   14 migration files
│       │   ├── seeders/             #   DatabaseSeeder with sample data
│       │   └── factories/           #   Model factories for testing
│       ├── routes/api.php           # All API route definitions
│       └── .env.example             # Environment variable template
│
├── ai-service-python/               # FastAPI predictive analytics microservice
│   ├── main.py                      # Outbreak forecasting & resource depletion API
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Production container config
│   └── .env.example                 # Environment variable template
│
└── README.md                        # ← You are here
```

---

## Prerequisites

Ensure the following software is installed before proceeding:

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| **Node.js** | 18.x or later | Frontend build & dev server |
| **npm** | 9.x or later | Node package manager (ships with Node.js) |
| **PHP** | 8.2 or later | Laravel backend runtime |
| **Composer** | 2.x | PHP dependency manager |
| **Python** | 3.11 or later | AI predictive analytics service |
| **pip** | 22.x or later | Python package manager (ships with Python) |
| **MySQL** or **MariaDB** | 8.0+ / 10.6+ | Primary database (or use SQLite for quick testing) |

> **Note:** On Windows, ensure `php`, `composer`, `python`, and `node` are available in your system PATH.

---

## Environment Setup

Each service has its own `.env.example` file. Copy them to `.env` and fill in the required values.

### 1. Laravel Backend

```bash
cd new-system/backend-laravel
cp .env.example .env
```

Key variables to configure:

| Variable | Description |
|----------|------------|
| `APP_KEY` | Auto-generated via `php artisan key:generate` |
| `APP_AES_SECRET` | 64-char hex string — must match frontend's `NEXT_PUBLIC_AES_SHARED_SECRET`. Generate with: `php -r "echo bin2hex(random_bytes(32));"` |
| `DB_CONNECTION` | `mysql` (production) or `sqlite` (quick local testing) |
| `DB_DATABASE` | Database name (e.g., `gchealthlink`) |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:3000` (must match frontend dev port) |
| `SESSION_DOMAIN` | `localhost` |
| `FRONTEND_URL` | `http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini API key (for AI assistant features) |
| `AI_SERVICE_URL` | `http://127.0.0.1:8001` (Python microservice address) |

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
```

Key variables to configure:

| Variable | Description |
|----------|------------|
| `NEXT_PUBLIC_BACKEND_URL` | Laravel API URL (e.g., `http://127.0.0.1:8000`) |
| `NEXT_PUBLIC_API_URL` | Same as above (alias used by the API client) |

### 3. AI Service

```bash
cd ai-service-python
cp .env.example .env
```

Key variables to configure:

| Variable | Description |
|----------|------------|
| `HOST` | Bind address (default: `127.0.0.1`) |
| `PORT` | Bind port (default: `8001`) |
| `AI_ALLOWED_ORIGINS` | Comma-separated CORS origins (default includes `http://localhost:3000`) |

---

## Installation & Execution Guide

### 1. Laravel Backend

```bash
# Navigate to the Laravel project
cd new-system/backend-laravel

# Install PHP dependencies
composer install

# Generate the application encryption key
php artisan key:generate

# Create the database (MySQL)
# Ensure your MySQL server is running and the database exists:
#   mysql -u root -e "CREATE DATABASE gchealthlink;"

# Run database migrations
php artisan migrate

# (Optional) Seed sample data for testing
php artisan db:seed

# Start the Laravel development server
php artisan serve
```

The API will be available at **http://127.0.0.1:8000**.

> **Seeded Test Accounts** (password for all: `password`)
>
> | Role | Email |
> |------|-------|
> | Admin | `admin@gordoncollege.edu.ph` |
> | Nurse | `nurse@gordoncollege.edu.ph` |
> | Doctor | `doctor@gordoncollege.edu.ph` |
> | Dentist | `dental@gordoncollege.edu.ph` |
> | Student | `student@gordoncollege.edu.ph` |

### 2. Python AI Service

```bash
# Navigate to the AI service directory
cd ai-service-python

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.venv\Scripts\activate.bat
# macOS / Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

The AI service will be available at **http://127.0.0.1:8001**.

API endpoints:
- `GET  /health` — Health check
- `POST /predict/outbreak` — Outbreak trend forecasting
- `POST /predict/resources` — Resource depletion prediction

### 3. Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the Next.js development server
npm run dev
```

The frontend will be available at **http://localhost:3000**.

---

## Recommended Execution Order

Start the services in this order to ensure all dependencies are available:

```
1.  Laravel Backend        →  php artisan serve                  (port 8000)
2.  Python AI Service      →  uvicorn main:app --port 8001       (port 8001)
3.  Frontend               →  npm run dev                        (port 3000)
```

> The frontend depends on the Laravel API for authentication and data. The Laravel backend calls the Python AI service for predictive analytics. Start them in the order listed above.

---

## API Architecture

```
┌─────────────┐       HTTPS / AES-256-GCM       ┌──────────────────┐
│             │  ◄──────────────────────────────► │                  │
│   Next.js   │       Sanctum SPA Auth           │  Laravel 11 API  │
│  Frontend   │                                  │   (port 8000)    │
│ (port 3000) │                                  │                  │
└─────────────┘                                  └────────┬─────────┘
                                                          │
                                                   HTTP REST
                                                          │
                                                 ┌────────▼─────────┐
                                                 │   FastAPI / ML   │
                                                 │  AI Microservice │
                                                 │   (port 8001)    │
                                                 └──────────────────┘
```

---

## Authors

**GCHealthLink Capstone Team** — Gordon College, Olongapo City
