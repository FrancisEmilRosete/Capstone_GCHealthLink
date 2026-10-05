<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ClinicStaffController extends Controller
{
    public function index()
    {
        return response()->json(\App\Models\ClinicStaff::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'position' => 'required|string'
        ]);

        $staff = \App\Models\ClinicStaff::create($validated);
        return response()->json($staff, 201);
    }

    public function update(Request $request, $id)
    {
        $staff = \App\Models\ClinicStaff::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'required|string',
            'position' => 'required|string'
        ]);

        $staff->update($validated);
        return response()->json($staff);
    }

    public function destroy($id)
    {
        $staff = \App\Models\ClinicStaff::findOrFail($id);
        $staff->delete();
        return response()->json(null, 204);
    }
}
