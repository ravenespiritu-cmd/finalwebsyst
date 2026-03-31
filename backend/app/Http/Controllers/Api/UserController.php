<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Get all users (Admin only).
     */
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min($request->get('per_page', 10), 50);
        $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $this->paginatedResponse($users);
    }

    /**
     * Get a single user.
     */
    public function show($id)
    {
        $user = User::withCount(['orders', 'reviews'])->find($id);

        if (!$user) {
            return $this->errorResponse('User not found', 404);
        }

        return $this->successResponse($user);
    }

    /**
     * Create a new user (Admin only).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
            'gcash_number' => 'nullable|string|regex:/^09\d{9}$/',
            'gcash_balance' => 'nullable|numeric|min:0',
            'role' => 'required|in:admin,customer,rider,supplier',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'gcash_number' => $request->gcash_number,
            'gcash_balance' => $request->gcash_balance ?? 0,
            'role' => $request->role,
            'address' => $request->address,
            'city' => $request->city,
            'state' => $request->state,
            'zip_code' => $request->zip_code,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return $this->successResponse($user, 'User created successfully', 201);
    }

    /**
     * Update a user (Admin only).
     */
    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->errorResponse('User not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'gcash_number' => 'nullable|string|regex:/^09\d{9}$/',
            'gcash_balance' => 'nullable|numeric|min:0',
            'role' => 'sometimes|in:admin,customer,rider,supplier',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->except('password');

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return $this->successResponse($user, 'User updated successfully');
    }

    /**
     * Delete a user (Admin only).
     */
    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->errorResponse('User not found', 404);
        }

        // Prevent deleting self
        if ($user->id === auth()->id()) {
            return $this->errorResponse('Cannot delete your own account', 400);
        }

        $user->delete();

        return $this->successResponse(null, 'User deleted successfully');
    }

    /**
     * Toggle user active status (Admin only).
     */
    public function toggleStatus($id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->errorResponse('User not found', 404);
        }

        // Prevent deactivating self
        if ($user->id === auth()->id()) {
            return $this->errorResponse('Cannot deactivate your own account', 400);
        }

        $user->update(['is_active' => !$user->is_active]);

        return $this->successResponse($user, 'User status updated');
    }

    /**
     * Get all riders.
     */
    public function riders()
    {
        $riders = User::where('role', 'rider')
            ->where('is_active', true)
            ->withCount('assignedDeliveries')
            ->get();

        return $this->successResponse($riders);
    }

    /**
     * Get all customers.
     */
    public function customers(Request $request)
    {
        $query = User::where('role', 'customer');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min($request->get('per_page', 10), 50);
        $customers = $query->withCount('orders')
            ->withSum('orders', 'total')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return $this->paginatedResponse($customers);
    }
}
