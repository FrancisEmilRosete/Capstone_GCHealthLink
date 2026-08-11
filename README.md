# GC HealthLink

**A Digital Clinic Management System for Gordon College Health Services Unit**

GC HealthLink is a web application made for the clinic of Gordon College in Olongapo City. It replaces paper-based processes with a digital system that handles student health records, appointment scheduling, medicine inventory, and more. It also includes an AI service that can predict disease outbreaks and warn staff when supplies are running low.

---

## What It Does

The system has five types of users, each with their own dashboard:

| User | What They Can Do |
|------|-----------------|
| **Admin** | Manage user accounts, view system-wide reports, check audit logs, configure settings |
| **Doctor** | View and update patient records, conduct physical exams, write medical certificates, use the AI health assistant |
| **Nurse / Staff** | Log clinic visits, scan student QR codes, manage the appointment queue, handle medicine inventory, post health advisories |
| **Dentist** | Manage the dental queue, keep dental records, track dental supplies |
| **Student** | View their own health record, book appointments, request consultations, message clinic staff |

### Main Features

- **Student Health Records** — Stores medical history, physical exam results, lab results, and uploaded documents for each student
- **Appointment Scheduling** — Students can book appointments; staff can configure available time slots and manage the queue
- **Medicine Inventory** — Tracks medicine stock in batches, automatically deducts when dispensed during clinic visits
- **Analytics Dashboard** — Shows illness trends, top health concerns, and visit counts using interactive charts
- **AI Health Assistant** — Uses Google Gemini to answer health-related questions and generate smart reminders
- **Outbreak Forecasting** — A separate Python service uses machine learning to predict future illness trends based on past clinic data
- **Supply Depletion Alerts** — The same Python service estimates when medicines will run out so staff can reorder in time
- **Works on Phones** — Built as a Progressive Web App (PWA), so it can be installed on mobile devices
- **Encrypted Communication** — All data sent between the frontend and backend is encrypted using AES-256-GCM
- **In-App Messaging** — Students can message clinic staff directly within the app
- **PDF Reports** — Staff can export visit logs, health statistics, and inventory data as PDF files
- **QR Code Login** — Staff can scan a student's QR code to quickly pull up their record
- **Audit Logging** — Every important action is recorded for accountability

---

## Technologies Used

### Frontend (`frontend/`)

| What | Technology |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Icons | Lucide React |
| PDF Export | jsPDF + jspdf-autotable |
| QR Scanning | html5-qrcode |
| Offline Support | next-pwa |
| Notifications | react-hot-toast |

### Backend (`new-system/backend-laravel/`)

| What | Technology |
|------|-----------|
| Framework | Laravel 11 |
| Language | PHP 8.2+ |
| Authentication | Laravel Sanctum (cookie-based SPA auth) |
| AI Integration | google-gemini-php/laravel |
| Database | MySQL / MariaDB |
| ORM | Eloquent (uses ULIDs as primary keys) |
| Testing | PHPUnit 11 |

### AI Service (`ai-service-python/`)

| What | Technology |
|------|-----------|
| Framework | FastAPI |
| Language | Python 3.11+ |
| Machine Learning | scikit-learn (Linear Regression) |
| Data Handling | pandas, NumPy |
| Server | Uvicorn / Gunicorn |

---

## Folder Structure

```
Capstone_GCHealthLink/
│
├── frontend/                        # The website users interact with
│   ├── app/                         # Pages and layouts
│   │   ├── (auth)/                  #   Login page
│   │   ├── dashboard/               #   All role-based dashboards
│   │   │   ├── admin/               #     Admin panel
│   │   │   ├── doctor/              #     Doctor panel
│   │   │   ├── staff/               #     Nurse/staff panel
│   │   │   ├── dental/              #     Dentist panel
│   │   │   └── student/             #     Student panel
│   │   └── doctor/records/          #   Doctor's patient records view
│   ├── components/                  # Reusable UI pieces
│   ├── lib/                         # API client, helpers, encryption logic
│   ├── constants/                   # Shared constants
│   ├── types/                       # TypeScript type definitions
│   └── public/                      # Images, icons, PWA manifest
│
├── new-system/
│   └── backend-laravel/             # The API server
│       ├── app/
│       │   ├── Http/Controllers/    #   Route handlers (19 controllers)
│       │   ├── Http/Middleware/      #   AES encryption middleware
│       │   └── Models/              #   Database models (15 models)
│       ├── config/                  # Configuration files
│       ├── database/
│       │   ├── migrations/          #   Database table definitions
│       │   ├── seeders/             #   Sample data for testing
│       │   └── factories/           #   Fake data generators
│       ├── routes/api.php           # All API endpoints
│       └── .env.example             # Environment variable template
│
├── ai-service-python/               # AI prediction service
│   ├── main.py                      # Outbreak and supply prediction logic
│   ├── requirements.txt             # Python packages needed
│   ├── Dockerfile                   # Container setup for deployment
│   └── .env.example                 # Environment variable template
│
└── README.md
```

---

## What You Need Installed

Before you start, make sure you have these on your computer:

| Software | Version | What It's For |
|----------|---------|--------------|
| **Node.js** | 18 or newer | Runs the frontend |
| **npm** | 9 or newer | Installs frontend packages (comes with Node.js) |
| **PHP** | 8.2 or newer | Runs the Laravel backend |
| **Composer** | 2.x | Installs PHP packages |
| **Python** | 3.11 or newer | Runs the AI service |
| **pip** | 22 or newer | Installs Python packages (comes with Python) |
| **MySQL** or **MariaDB** | 8.0+ / 10.6+ | Stores all the data |

> **Windows users:** Make sure `php`, `composer`, `python`, and `node` can be found from any terminal. If not, add them to your system PATH.

---

## Setting Up Environment Files

Each part of the project has its own `.env.example` file. You need to copy it and fill in the values for your local setup.

### 1. Laravel Backend

```bash
cd new-system/backend-laravel
cp .env.example .env
```

The important variables:

| Variable | What To Put |
|----------|------------|
| `APP_KEY` | Leave blank — it gets filled in automatically when you run `php artisan key:generate` |
| `APP_AES_SECRET` | A 64-character hex string. Generate one by running: `php -r "echo bin2hex(random_bytes(32));"` — this must match the frontend's value |
| `DB_CONNECTION` | Use `mysql` for a real database, or `sqlite` if you just want to try things quickly |
| `DB_DATABASE` | Your database name (example: `gchealthlink`) |
| `DB_USERNAME` / `DB_PASSWORD` | Your database login credentials |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:3000` |
| `SESSION_DOMAIN` | `localhost` |
| `FRONTEND_URL` | `http://localhost:3000` |
| `GEMINI_API_KEY` | Your Google Gemini API key (needed for the AI assistant) |
| `AI_SERVICE_URL` | `http://127.0.0.1:8001` (where the Python service runs) |

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
```

| Variable | What To Put |
|----------|------------|
| `NEXT_PUBLIC_BACKEND_URL` | Where Laravel is running (example: `http://127.0.0.1:8000`) |
| `NEXT_PUBLIC_API_URL` | Same as above |

### 3. AI Service

```bash
cd ai-service-python
cp .env.example .env
```

| Variable | What To Put |
|----------|------------|
| `HOST` | `127.0.0.1` (default) |
| `PORT` | `8001` (default) |
| `AI_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend URLs |

---

## How to Install and Run

### Step 1: Start the Laravel Backend

```bash
# Go to the Laravel folder
cd new-system/backend-laravel

# Install PHP packages
composer install

# Generate the app key (fills in APP_KEY in your .env)
php artisan key:generate

# Set up the database tables
php artisan migrate

# (Optional) Load sample data so you have something to test with
php artisan db:seed

# Start the server
php artisan serve
```

This starts the API at **http://127.0.0.1:8000**.

If you ran `db:seed`, you can log in with these test accounts (password for all of them is `password`):

| Role | Email |
|------|-------|
| Admin | `admin@gordoncollege.edu.ph` |
| Nurse | `nurse@gordoncollege.edu.ph` |
| Doctor | `doctor@gordoncollege.edu.ph` |
| Dentist | `dental@gordoncollege.edu.ph` |
| Student | `student@gordoncollege.edu.ph` |

### Step 2: Start the Python AI Service

```bash
# Go to the AI service folder
cd ai-service-python

# Create a virtual environment
python -m venv .venv

# Activate it
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.venv\Scripts\activate.bat
# On macOS / Linux:
source .venv/bin/activate

# Install the required packages
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

This starts the AI service at **http://127.0.0.1:8001**.

It has three endpoints:
- `GET  /health` — Check if the service is running
- `POST /predict/outbreak` — Predict future illness trends
- `POST /predict/resources` — Predict when supplies will run out

### Step 3: Start the Frontend

```bash
# Go to the frontend folder
cd frontend

# Install packages
npm install

# Start the dev server
npm run dev
```

This starts the website at **http://localhost:3000**.

---

## Start Order

Start the three services in this order:

```
1.  Laravel Backend        -->  php artisan serve               (port 8000)
2.  Python AI Service      -->  uvicorn main:app --port 8001    (port 8001)
3.  Frontend               -->  npm run dev                     (port 3000)
```

The frontend needs the Laravel API to work. Laravel calls the Python service when it needs AI predictions. So start them in this order — backend first, AI second, frontend last.

---

## How the Services Talk to Each Other

```
┌─────────────┐     AES-encrypted requests     ┌──────────────────┐
│             │ <-----------------------------> │                  │
│   Next.js   │     Cookie-based auth           │  Laravel 11 API  │
│  Frontend   │                                 │   (port 8000)    │
│ (port 3000) │                                 │                  │
└─────────────┘                                 └────────┬─────────┘
                                                         │
                                                    HTTP calls
                                                         │
                                                ┌────────▼─────────┐
                                                │  FastAPI + ML    │
                                                │  AI Service      │
                                                │  (port 8001)     │
                                                └──────────────────┘
```

The frontend sends encrypted requests to Laravel. Laravel handles authentication, data storage, and most business logic. When AI predictions are needed, Laravel forwards the request to the Python microservice, which runs the machine learning models and sends the results back.

---

## Authors

**GCHealthLink Capstone Team** — Gordon College, Olongapo City
