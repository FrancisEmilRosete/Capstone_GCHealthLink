<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| GCHealthLink API Routes — Laravel 11
|--------------------------------------------------------------------------
|
| All routes here are prefixed with /api automatically.
| The EncryptApiPayload middleware is applied globally to the api group
| in bootstrap/app.php, so every route below is encrypted by default.
|
*/

// --------------------------------------------------------------------------
// Health check (excluded from encryption — see EncryptApiPayload::$excludedPaths)
// --------------------------------------------------------------------------
Route::get('/health', fn () => response()->json(['status' => 'ok']));

// --------------------------------------------------------------------------
// Sanctum CSRF cookie & Broadcasting Auth
// --------------------------------------------------------------------------
// Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);
// Broadcasting auth (/api/broadcasting/auth) + channels.php are registered
// in bootstrap/app.php via withBroadcasting() so they survive route:cache.

// --------------------------------------------------------------------------
// Public routes (authentication)
// --------------------------------------------------------------------------
Route::prefix('auth')->group(function (): void {
    Route::post('/login',           [\App\Http\Controllers\AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::post('/qr',              [\App\Http\Controllers\AuthController::class, 'loginQr'])->middleware('throttle:6,1');
});

Route::post('students/registration/public', [\App\Http\Controllers\StudentRegistrationController::class, 'publicRegistration']);

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Protected routes — require valid Sanctum token + general rate limit (120 req/min)
// --------------------------------------------------------------------------
Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function (): void {

    // Auth
    Route::prefix('auth')->group(function (): void {
        Route::post('/logout',          [\App\Http\Controllers\AuthController::class, 'logout']);
        Route::get('/me',               [\App\Http\Controllers\AuthController::class, 'me']);
        Route::post('/qr/generate',     [\App\Http\Controllers\AuthController::class, 'generateQrToken']);
    });

    // ── Admin-Only Operations (role:ADMIN) ──────────────────────────────────
    Route::middleware('role:ADMIN')->group(function (): void {
        Route::get('admin/me',          [\App\Http\Controllers\AdminUserController::class, 'me']);
        Route::get('admin/users',       [\App\Http\Controllers\AdminUserController::class, 'index']);
        Route::get('audit',             [\App\Http\Controllers\AuditController::class, 'index']);

        // System data modifications (mutations restricted to Admin)
        Route::post('departments',                       [\App\Http\Controllers\DepartmentController::class, 'store']);
        Route::match(['put', 'patch'], 'departments/{department}', [\App\Http\Controllers\DepartmentController::class, 'update']);
        Route::delete('departments/{department}',        [\App\Http\Controllers\DepartmentController::class, 'destroy']);

        Route::post('courses',                           [\App\Http\Controllers\CourseController::class, 'store']);
        Route::match(['put', 'patch'], 'courses/{course}', [\App\Http\Controllers\CourseController::class, 'update']);
        Route::delete('courses/{course}',                [\App\Http\Controllers\CourseController::class, 'destroy']);

        Route::post('staff',                             [\App\Http\Controllers\ClinicStaffController::class, 'store']);
        Route::match(['put', 'patch'], 'staff/{staff}',   [\App\Http\Controllers\ClinicStaffController::class, 'update']);
        Route::delete('staff/{staff}',                   [\App\Http\Controllers\ClinicStaffController::class, 'destroy']);
    });

    // ── Admin & Clinic Staff Operations (role:ADMIN,CLINIC_STAFF) ───────────
    Route::middleware('role:ADMIN,CLINIC_STAFF')->group(function (): void {
        // Analytics
        Route::get('admin/analytics',   [\App\Http\Controllers\AdminAnalyticsController::class, 'getAnalytics']);
        Route::prefix('analytics')->group(function (): void {
            Route::get('/trends',          [\App\Http\Controllers\AdminAnalyticsController::class, 'getTrends']);
            Route::get('/health-concerns', [\App\Http\Controllers\AdminAnalyticsController::class, 'getHealthConcerns']);
        });

        // AI Risk Prediction
        Route::post('/ai/predict-patient-risk', [\App\Http\Controllers\AiRiskController::class, 'predictPatientRisk']);

        // Clinic Operations
        Route::prefix('clinic')->group(function (): void {
            Route::get('/students',             [\App\Http\Controllers\ClinicController::class, 'students']);
            Route::get('/search',               [\App\Http\Controllers\ClinicController::class, 'search']);
            Route::get('/scan/{userId}',        [\App\Http\Controllers\ClinicController::class, 'scan']);
            Route::get('/scan-token/{token}',   [\App\Http\Controllers\ClinicController::class, 'scanToken']);
            Route::get('/visits',               [\App\Http\Controllers\ClinicVisitController::class, 'index']);
            Route::post('/visits',              [\App\Http\Controllers\ClinicVisitController::class, 'store']);
            Route::put('/visits/dispense/{medId}', [\App\Http\Controllers\ClinicController::class, 'dispense']);
            Route::get('/activity-logs',        [\App\Http\Controllers\ClinicController::class, 'activityLogs']);
            Route::get('/reports',              [\App\Http\Controllers\ClinicController::class, 'getNurseReports']);
            Route::post('/emergency-alert',     [\App\Http\Controllers\ClinicController::class, 'sendEmergencyAlert']);
        });

        // Availability schedule management
        Route::put('appointments/availability/config', [\App\Http\Controllers\AppointmentAvailabilityController::class, 'updateConfig']);

        // Physical Exam Recording
        Route::post('physical-exams', [\App\Http\Controllers\PhysicalExamController::class, 'store']);

        // Report Generation
        Route::get('/reports/generate', [\App\Http\Controllers\ReportController::class, 'generateReport']);
    });

    // ── Reference / System Data (Read-only for all authenticated roles) ────
    Route::get('departments',              [\App\Http\Controllers\DepartmentController::class, 'index']);
    Route::get('departments/{department}', [\App\Http\Controllers\DepartmentController::class, 'show']);
    Route::get('courses',                  [\App\Http\Controllers\CourseController::class, 'index']);
    Route::get('courses/{course}',         [\App\Http\Controllers\CourseController::class, 'show']);
    Route::get('staff',                    [\App\Http\Controllers\ClinicStaffController::class, 'index']);
    Route::get('staff/{staff}',            [\App\Http\Controllers\ClinicStaffController::class, 'show']);

    // ── Students Directory & Profiles ──────────────────────────────────────
    Route::post('students/registration', [\App\Http\Controllers\StudentRegistrationController::class, 'authenticatedRegistration'])->middleware('ability:*');
    Route::get('students/me', [\App\Http\Controllers\StudentController::class, 'me']);
    Route::get('students/qr', [\App\Http\Controllers\StudentController::class, 'qr']);
    Route::get('students/by-number/{student_number}', [\App\Http\Controllers\StudentController::class, 'byNumber']);
    Route::apiResource('students', \App\Http\Controllers\StudentController::class);

    // ── Clinic Visits ──────────────────────────────────────────────────────
    Route::apiResource('visits', \App\Http\Controllers\ClinicVisitController::class);

    // ── Appointments ───────────────────────────────────────────────────────
    Route::get(   'appointments/availability/config', [\App\Http\Controllers\AppointmentAvailabilityController::class, 'getConfig']);
    Route::get(   'appointments/availability',        [\App\Http\Controllers\AppointmentAvailabilityController::class, 'getAvailability']);
    Route::get(   'appointments/queue',               [\App\Http\Controllers\AppointmentController::class, 'index']);
    Route::match(['put', 'patch'], 'appointments/queue/{appointment}', [\App\Http\Controllers\AppointmentController::class, 'updateStatus']);
    Route::post(  'appointments/queue',               [\App\Http\Controllers\AppointmentController::class, 'store']);
    Route::get(   'appointments',                     [\App\Http\Controllers\AppointmentController::class, 'index']);
    Route::post(  'appointments',                     [\App\Http\Controllers\AppointmentController::class, 'store']);
    Route::get(   'appointments/{appointment}',       [\App\Http\Controllers\AppointmentController::class, 'show']);
    Route::patch( 'appointments/{appointment}',       [\App\Http\Controllers\AppointmentController::class, 'updateStatus']);
    Route::delete('appointments/{appointment}',       [\App\Http\Controllers\AppointmentController::class, 'destroy']);

    // ── Inventory + Batches ────────────────────────────────────────────────
    Route::apiResource('inventory', \App\Http\Controllers\InventoryController::class);
    Route::post('inventory/{inventory}/batches', [\App\Http\Controllers\InventoryController::class, 'addBatch']);

    // ── Medical Certificates ───────────────────────────────────────────────
    Route::apiResource('certificates', \App\Http\Controllers\MedicalCertificateController::class)
         ->only(['index', 'store', 'show', 'destroy']);

    // ── Health Advisories ──────────────────────────────────────────────────
    Route::apiResource('advisories', \App\Http\Controllers\HealthAdvisoryController::class);

    // ── Physical Examinations (Index has student ownership enforcement) ─────
    Route::get('physical-exams', [\App\Http\Controllers\PhysicalExamController::class, 'index']);
    
    // ── Medical Documents (Ownership enforced in controller) ───────────────
    Route::prefix('documents')->group(function (): void {
        Route::post('/upload',       [\App\Http\Controllers\MedicalDocumentController::class, 'upload']);
        Route::get('/file/{id}',     [\App\Http\Controllers\MedicalDocumentController::class, 'download']);
        Route::get('/{studentId}',   [\App\Http\Controllers\MedicalDocumentController::class, 'index']);
    });

    // ── AI Assistant (Phase 4) ─────────────────────────────────────────────
    Route::prefix('ai')->group(function (): void {
        Route::post('/assist', [\App\Http\Controllers\AiAssistantController::class, 'assist'])
             ->withoutMiddleware([\App\Http\Middleware\EncryptApiPayloads::class]);
        Route::get('/smart-reminders',   [\App\Http\Controllers\AiAssistantController::class, 'smartReminders']);
        Route::get('/outbreak-forecast', [\App\Http\Controllers\AiAssistantController::class, 'outbreakForecast']);
    });

    // ── In-App Messaging (Role-Based) ──────────────────────────────────────
    Route::prefix('messages')->group(function (): void {
        Route::get('/contacts',          [\App\Http\Controllers\MessageController::class, 'contacts']);
        Route::get('/unread-count',      [\App\Http\Controllers\MessageController::class, 'unreadCount']);
        Route::get('/thread/{userId}',   [\App\Http\Controllers\MessageController::class, 'thread']);
        Route::post('/',                 [\App\Http\Controllers\MessageController::class, 'store']);
        Route::patch('/read-all',        [\App\Http\Controllers\MessageController::class, 'markAllRead']);
        Route::patch('/{id}/read',       [\App\Http\Controllers\MessageController::class, 'markRead']);
    });

});
