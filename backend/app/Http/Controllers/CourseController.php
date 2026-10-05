<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index()
    {
        return response()->json(\App\Models\Course::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:courses',
            'name' => 'required|string'
        ]);

        $course = \App\Models\Course::create($validated);
        return response()->json($course, 201);
    }

    public function update(Request $request, $id)
    {
        $course = \App\Models\Course::findOrFail($id);
        
        $validated = $request->validate([
            'code' => 'required|string|unique:courses,code,' . $course->id,
            'name' => 'required|string'
        ]);

        $course->update($validated);
        return response()->json($course);
    }

    public function destroy($id)
    {
        $course = \App\Models\Course::findOrFail($id);
        $course->delete();
        return response()->json(null, 204);
    }
}
