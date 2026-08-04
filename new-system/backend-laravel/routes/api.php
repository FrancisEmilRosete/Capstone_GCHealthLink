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
// Sanctum CSRF cookie (excluded from encryption)
// --------------------------------------------------------------------------
// Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);
// This is registered automatically by Sanctum — just ensure it's in the
// excluded paths list in EncryptApiPayload.

// --------------------------------------------------------------------------
// Public routes (authentication)
// --------------------------------------------------------------------------
Route::prefix('auth')->group(function (): void {
    Route::post('/login',           [\App\Http\Controllers\AuthController::class, 'login']);
    Route::post('/qr',              [\App\Http\Controllers\AuthController::class, 'loginQr']);
});

Route::post('students/registration/public', [\App\Http\Controllers\StudentRegistrationController::class, 'publicRegistration']);

// --------------------------------------------------------------------------
// Protected routes — require valid Sanctum token
// --------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function (): void {

    // Auth
    Route::prefix('auth')->group(function (): void {
        Route::post('/logout',          [\App\Http\Controllers\AuthController::class, 'logout']);
        Route::get('/me',               [\App\Http\Controllers\AuthController::class, 'me']);
        Route::post('/qr/generate',     [\App\Http\Controllers\AuthController::class, 'generateQrToken']);
    });

    // Admin Analytics & Users
    Route::get('admin/analytics', [\App\Http\Controllers\AdminAnalyticsController::class, 'getAnalytics']);
    Route::get('admin/users', [\App\Http\Controllers\AdminUserController::class, 'index']);

    // Shared Analytics
    Route::prefix('analytics')->group(function (): void {
        Route::get('/trends', [\App\Http\Controllers\AdminAnalyticsController::class, 'getTrends']);
        Route::get('/health-concerns', [\App\Http\Controllers\AdminAnalyticsController::class, 'getHealthConcerns']);
    });

    // Clinic Compatibility (Legacy Frontend)
    Route::prefix('clinic')->group(function (): void {
        Route::get('/students', [\App\Http\Controllers\ClinicController::class, 'students']);
        Route::get('/search', [\App\Http\Controllers\ClinicController::class, 'search']);
        Route::get('/scan/{userId}', [\App\Http\Controllers\ClinicController::class, 'scan']);
        Route::get('/scan-token/{token}', [\App\Http\Controllers\ClinicController::class, 'scanToken']);
        Route::get('/visits', [\App\Http\Controllers\ClinicVisitController::class, 'index']);
        Route::post('/visits', [\App\Http\Controllers\ClinicVisitController::class, 'store']);
        Route::put('/visits/dispense/{medId}', [\App\Http\Controllers\ClinicController::class, 'dispense']);
        Route::get('/activity-logs', [\App\Http\Controllers\ClinicController::class, 'activityLogs']);
        Route::get('/reports', [\App\Http\Controllers\ClinicController::class, 'getNurseReports']);
        Route::post('/emergency-alert', [\App\Http\Controllers\ClinicController::class, 'sendEmergencyAlert']);
    });

    // Students
    Route::post('students/registration', [\App\Http\Controllers\StudentRegistrationController::class, 'authenticatedRegistration']);
    Route::get('students/me', [\App\Http\Controllers\StudentController::class, 'me']);
    Route::get('students/qr', [\App\Http\Controllers\StudentController::class, 'qr']);
    Route::get('students/by-number/{student_number}', [\App\Http\Controllers\StudentController::class, 'byNumber']);
    Route::apiResource('students', \App\Http\Controllers\StudentController::class);

    // Clinic Visits
    Route::apiResource('visits', \App\Http\Controllers\ClinicVisitController::class);

    // Appointments — explicit mapping so we can use PATCH for status updates
    Route::get(   'appointments/availability/config', [\App\Http\Controllers\AppointmentAvailabilityController::class, 'getConfig']);
    Route::put(   'appointments/availability/config', [\App\Http\Controllers\AppointmentAvailabilityController::class, 'updateConfig']);
    Route::get(   'appointments/availability',        [\App\Http\Controllers\AppointmentAvailabilityController::class, 'getAvailability']);
    Route::get(   'appointments/queue',             [\App\Http\Controllers\AppointmentController::class, 'index']);
    Route::match(['put', 'patch'], 'appointments/queue/{appointment}', [\App\Http\Controllers\AppointmentController::class, 'updateStatus']);
    Route::post(  'appointments/queue',             [\App\Http\Controllers\AppointmentController::class, 'store']);
    Route::get(   'appointments',                   [\App\Http\Controllers\AppointmentController::class, 'index']);
    Route::post(  'appointments',                   [\App\Http\Controllers\AppointmentController::class, 'store']);
    Route::get(   'appointments/{appointment}',     [\App\Http\Controllers\AppointmentController::class, 'show']);
    Route::patch( 'appointments/{appointment}',     [\App\Http\Controllers\AppointmentController::class, 'updateStatus']);
    Route::delete('appointments/{appointment}',     [\App\Http\Controllers\AppointmentController::class, 'destroy']);

    // Inventory + batch management
    Route::apiResource('inventory', \App\Http\Controllers\InventoryController::class);
    Route::post('inventory/{inventory}/batches',    [\App\Http\Controllers\InventoryController::class, 'addBatch']);

    // Medical Certificates
    Route::apiResource('certificates', \App\Http\Controllers\MedicalCertificateController::class)
         ->only(['index', 'store', 'show', 'destroy']);

    // Health Advisories
    Route::apiResource('advisories', \App\Http\Controllers\HealthAdvisoryController::class);

    // Physical Exams
    Route::apiResource('physical-exams', \App\Http\Controllers\PhysicalExamController::class);
    
    // Medical Documents
    Route::prefix('documents')->group(function (): void {
        Route::post('/upload', [\App\Http\Controllers\MedicalDocumentController::class, 'upload']);
        Route::get('/file/{id}', [\App\Http\Controllers\MedicalDocumentController::class, 'download']);
        Route::get('/{studentId}', [\App\Http\Controllers\MedicalDocumentController::class, 'index']);
    });

    // Generate Reports
    Route::get('/reports/generate', [\App\Http\Controllers\ReportController::class, 'generateReport']);

    // AI Assistant (Phase 4)
    Route::prefix('ai')->group(function (): void {
        Route::post('/assist', [\App\Http\Controllers\AiAssistantController::class, 'assist'])
             ->withoutMiddleware([\App\Http\Middleware\EncryptApiPayload::class]);
        Route::get('/smart-reminders', [\App\Http\Controllers\AiAssistantController::class, 'smartReminders']);
        Route::get('/outbreak-forecast', [\App\Http\Controllers\AiAssistantController::class, 'outbreakForecast']);
    });

    // Audit logs
    Route::get('/audit', [\App\Http\Controllers\AuditController::class, 'index']);

    // In-App Messaging (Role-Based)
    // Students → Nurse / Doctor / Dentist only (Students cannot message Students)
    Route::prefix('messages')->group(function (): void {
        Route::get('/contacts',          [\App\Http\Controllers\MessageController::class, 'contacts']);
        Route::get('/unread-count',      [\App\Http\Controllers\MessageController::class, 'unreadCount']);
        Route::get('/thread/{userId}',   [\App\Http\Controllers\MessageController::class, 'thread']);
        Route::post('/',                 [\App\Http\Controllers\MessageController::class, 'store']);
        Route::patch('/{id}/read',       [\App\Http\Controllers\MessageController::class, 'markRead']);
    });

});
