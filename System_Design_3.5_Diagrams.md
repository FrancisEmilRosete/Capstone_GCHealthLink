# 3.5 System Diagrams - GCHealthLink

This document is based on the current implementation in the monorepo:
- Backend API mounts under `/api/v1/*`
- Clinic scanning and visit logging flow in `clinic.routes.js` and `clinic.controller.js`
- Admin analytics flow in `admin.routes.js` and `admin.controller.js`
- AI bridge flow in `ai.routes.js`, `ai.controller.js`, and `ai-service-python/main.py`
- Data model in `prisma/schema.prisma`

## 3.5.1 Use Case Diagram

Actors requested:
- Clinic Staff: scans and records clinic data
- Students: provide student ID/QR for identification

Additional system actor shown:
- Admin: consumes trend reports

```mermaid
flowchart LR
    Student([Student])
    Staff([Clinic Staff])
    Admin([Admin])

    subgraph GCHealthLink[GCHealthLink System]
      UC1((Provide Student ID/QR))
      UC2((Scan QR / Search Student))
      UC3((View Student Medical Record))
      UC4((Record Clinic Visit))
      UC5((Record Physical Exam))
      UC6((Dispense Medicines and Update Stock))
      UC7((Send Emergency Contact SMS))
      UC8((Generate AI Outbreak Forecast))
      UC9((Generate Trend Reports))
    end

    Student --> UC1
    Staff --> UC2
    Staff --> UC3
    Staff --> UC4
    Staff --> UC5
    Staff --> UC6
    Staff --> UC7
    Admin --> UC8
    Admin --> UC9

    UC1 --> UC2
    UC2 --> UC3
    UC3 --> UC4
    UC4 --> UC6
    UC4 --> UC9
    UC8 --> UC9
```

## 3.5.2 Activity Diagrams

### A. QR Code Scanning Activity

```mermaid
flowchart TD
    A([Start]) --> B[Clinic Staff opens Scanner page]
    B --> C[Camera scans QR or manual search input]
    C --> D{Payload type?}

    D -->|qrToken| E[GET /api/v1/clinic/scan-token/:qrToken]
    D -->|userId| F[GET /api/v1/clinic/scan/:studentId]
    D -->|studentNumber/fallback| G[GET /api/v1/clinic/search?q=...]

    G --> H{Match found?}
    H -->|No| I[Show Student Not Found]
    H -->|Yes| J[Resolve userId then call /clinic/scan/:studentId]

    E --> K[Decrypt medical history + build emergency alert]
    F --> K
    J --> K

    K --> L[Return student profile to scanner UI]
    L --> M[Show patient card + actions]
    M --> N([End])

    I --> N
```

### B. AI Health Summary / Forecast Activity

Note: Current implementation exposes AI forecasting (`/api/v1/ai/outbreak-forecast` and `/api/v1/ai/resource-prediction`).

```mermaid
flowchart TD
    A([Start]) --> B[Admin/Staff requests AI forecast]
    B --> C[Express AI route validates auth/role]
    C --> D[AI controller queries database]

    D --> E[Build payload from ClinicVisit and/or Inventory data]
    E --> F[POST payload to FastAPI service]

    F --> G{FastAPI validates payload?}
    G -->|No| H[Return validation/service error]
    G -->|Yes| I[Run prediction logic]

    I --> J[Outbreak: aggregate historical data + linear regression]
    I --> K[Resource: depletion horizon + risk status]

    J --> L[Return forecast JSON]
    K --> L
    L --> M[Express returns API response]
    M --> N[Frontend shows AI forecast panel]

    H --> O([End with error message])
    N --> P([End])
```

### C. Save Clinic Visit Activity

```mermaid
flowchart TD
    A([Start]) --> B[Staff clicks Consult Save in scanner]
    B --> C[Build structured complaint + medicines payload]
    C --> D[POST /api/v1/clinic/visits]

    D --> E[Backend validates studentProfileId, date, fields, medicines]
    E --> F{Valid request?}
    F -->|No| G[Return 400/404 validation error]
    F -->|Yes| H[Begin DB transaction]

    H --> I[Create ClinicVisit]
    I --> J{Has dispensed medicines?}
    J -->|No| M[Fetch created visit with relations]
    J -->|Yes| K[Update inventory stock atomically]

    K --> L{Stock available?}
    L -->|No| Q[Rollback transaction + return error]
    L -->|Yes| R[Create VisitMedicine rows]
    R --> M

    M --> S[Commit transaction]
    S --> T[Return success response]
    T --> U[UI shows success message]

    G --> V([End with error])
    Q --> V
    U --> W([End])
```

## 3.5.3 Entity Relationship Diagram (ERD)

Focus requested: Student IDs, Medical Histories, Vital Signs, and how they connect.

```mermaid
erDiagram
    USER ||--o| STUDENT_PROFILE : owns
    STUDENT_PROFILE ||--o| MEDICAL_HISTORY : has
    STUDENT_PROFILE ||--o{ PHYSICAL_EXAMINATION : has
    STUDENT_PROFILE ||--o{ CLINIC_VISIT : receives
    USER ||--o{ CLINIC_VISIT : handles
    CLINIC_VISIT ||--o{ VISIT_MEDICINE : includes
    INVENTORY ||--o{ VISIT_MEDICINE : dispensed_from
    STUDENT_PROFILE ||--o{ LAB_RESULT : has

    USER {
      string id PK
      string email UK
      enum role
      string qrToken
    }

    STUDENT_PROFILE {
      string id PK
      string userId FK UK
      string studentNumber UK
      string firstName
      string lastName
      string courseDept
      int age
      string sex
    }

    MEDICAL_HISTORY {
      string id PK
      string studentProfileId FK UK
      string allergyEnc
      string asthmaEnc
      string diabetesEnc
      string hypertensionEnc
      string operationNatureAndDateEnc
    }

    PHYSICAL_EXAMINATION {
      string id PK
      string studentProfileId FK
      date examDate
      enum yearLevel
      string bp
      string cr
      string rr
      string temp
      string height
      string weight
      string bmi
    }

    CLINIC_VISIT {
      string id PK
      string studentProfileId FK
      string handledById FK
      date visitDate
      string visitTime
      string chiefComplaintEnc
      string concernTag
    }

    VISIT_MEDICINE {
      string id PK
      string visitId FK
      string inventoryId FK
      int quantity
    }

    INVENTORY {
      string id PK
      string itemName UK
      int currentStock
      int reorderThreshold
      string unit
    }

    LAB_RESULT {
      string id PK
      string studentProfileId FK
      date date
      string bloodType
      string xrayFindingsEnc
    }
```

## 3.5.4 Data Flow Diagram (DFD)

Target flow requested: clinic visit data moving into AI processing and producing Trend Reports for administration.

```mermaid
flowchart LR
    Staff([Clinic Staff])
    Student([Student])
    Admin([School Admin])

    P1[[P1: Scan and Identify Student]]
    P2[[P2: Record Clinic Visit]]
    P3[[P3: Aggregate Health Analytics]]
    P4[[P4: AI Forecast Processing]]
    P5[[P5: Publish Trend Reports Dashboard]]

    D1[(D1: StudentProfile + MedicalHistory + PhysicalExamination)]
    D2[(D2: ClinicVisit)]
    D3[(D3: VisitMedicine + Inventory)]
    D4[(D4: Analytics Output)]
    D5[(D5: AI Forecast Output)]

    Student -->|Student ID / QR| P1
    Staff -->|Scan/Search Request| P1
    P1 -->|Student context| D1

    Staff -->|Consultation details + medicines| P2
    P2 -->|Create visit| D2
    P2 -->|Update stock + dispense log| D3

    D2 --> P3
    D1 --> P3
    P3 -->|Department heatmap, top concerns, outbreak watch, trends| D4

    D2 --> P4
    D3 --> P4
    P4 -->|Outbreak/resource forecast| D5

    D4 --> P5
    D5 --> P5
    Admin -->|Open Admin Dashboard / Reports| P5
    P5 -->|Trend Reports + operational recommendations| Admin
```

---

## Notes for your manuscript

- If your panel expects strict UML notation, convert the 3.5.1 flowchart into UML use case ovals/associations in draw.io or StarUML.
- If your panel expects formal DFD notation (Yourdon/DeMarco), keep the same processes and data stores, then redraw with circles/processes and open-ended data stores.
- Current implementation has two analytics paths:
  - Aggregated analytics from backend (`/api/v1/admin/analytics`) used by Admin Reports.
  - AI microservice forecasts via backend bridge (`/api/v1/ai/outbreak-forecast`, `/api/v1/ai/resource-prediction`).
