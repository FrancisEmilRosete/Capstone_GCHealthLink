<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(\App\Models\Department::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:departments',
            'name' => 'required|string'
        ]);

        $department = \App\Models\Department::create($validated);
        return response()->json($department, 201);
    }

    public function show(string $id)
    {
        return response()->json(\App\Models\Department::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $department = \App\Models\Department::findOrFail($id);
        
        $validated = $request->validate([
            'code' => 'required|string|unique:departments,code,' . $department->id,
            'name' => 'required|string'
        ]);

        $department->update($validated);
        return response()->json($department);
    }

    public function destroy(string $id)
    {
        $department = \App\Models\Department::findOrFail($id);
        $department->delete();
        return response()->json(null, 204);
    }
}
