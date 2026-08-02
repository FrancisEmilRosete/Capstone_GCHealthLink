<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\MedicalDocument;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedicalDocumentController extends Controller
{
    /**
     * Display a listing of documents for a student.
     */
    public function index(Request $request, string $studentId): JsonResponse
    {
        // Actually the original Express route was /:studentId, but the parameter name might be studentProfileId depending on frontend
        // Assuming studentId refers to student_profile_id
        $documents = MedicalDocument::where('student_profile_id', $studentId)
            ->orderBy('uploaded_at', 'desc')
            ->get();
            
        return response()->json([
            'success' => true,
            'message' => 'Medical documents retrieved successfully.',
            'data' => $documents
        ]);
    }

    /**
     * Store a newly created document.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'studentProfileId' => 'required|exists:student_profiles,id',
            'file' => 'required|file|max:10240', // 10MB max
            'documentType' => 'nullable|string|max:100'
        ]);

        if (!$request->hasFile('file')) {
            return response()->json(['success' => false, 'message' => 'No file uploaded.'], 400);
        }

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        
        // Use local storage in 'documents' directory
        $path = $file->storeAs(
            'documents', 
            uniqid() . '-' . time() . '-' . preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $fileName), 
            'local'
        );

        $document = MedicalDocument::create([
            'student_profile_id' => $request->input('studentProfileId'),
            'file_name' => $fileName,
            'file_url' => $path, // We store the internal path here
            'document_type' => $request->input('documentType', 'OTHER'),
        ]);

        AuditLog::record(
            'UPLOADED_DOCUMENT',
            "Uploaded document: {$fileName}",
            $document->student_profile_id,
            ['document_id' => $document->id, 'documentType' => $document->document_type]
        );

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully.',
            'data' => $document
        ], 201);
    }

    /**
     * Download the specified document.
     */
    public function download(string $id)
    {
        $document = MedicalDocument::find($id);

        if (!$document) {
            return response()->json(['success' => false, 'message' => 'Document not found.'], 404);
        }

        if (!Storage::disk('local')->exists($document->file_url)) {
            return response()->json(['success' => false, 'message' => 'File not found on server.'], 404);
        }

        AuditLog::record(
            'DOWNLOADED_DOCUMENT',
            "Downloaded document: {$document->file_name}",
            $document->student_profile_id,
            ['document_id' => $document->id]
        );

        return Storage::disk('local')->download($document->file_url, $document->file_name);
    }
}
