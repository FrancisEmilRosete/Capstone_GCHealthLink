<?php
$user = \App\Models\User::where('clinic_staff_type', 'DOCTOR')->first();
$request = \Illuminate\Http\Request::create('/api/appointments/queue?status=WAITING,PENDING,IN_PROGRESS,FOR_DISPENSING,COMPLETED', 'GET');
$request->setUserResolver(function() use ($user) { return $user; });
$controller = new \App\Http\Controllers\AppointmentController();
$response = $controller->index($request);
echo json_encode($response->toResponse($request)->getData());
