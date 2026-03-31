<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Laravel\Socialite\Facades\Socialite;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
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
            'role' => 'customer',
        ]);

        $token = JWTAuth::fromUser($user);

        return $this->successResponse([
            'user' => $user,
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
        ], 'Registration successful', 201);
    }

    /**
     * Login user and return JWT token.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $credentials = $request->only('email', 'password');

        if (!$token = JWTAuth::attempt($credentials)) {
            $existing = User::where('email', $request->input('email'))->first();
            if ($existing && !empty($existing->google_id)) {
                return $this->errorResponse(
                    'This email is set up with Google sign-in. Use Continue with Google, or Forgot password to set a password for email login.',
                    401
                );
            }

            return $this->errorResponse('Invalid credentials', 401);
        }

        $user = auth()->user();

        if (!$user->is_active) {
            JWTAuth::invalidate($token);
            return $this->errorResponse('Your account has been deactivated', 403);
        }

        // Update last login
        $user->update(['last_login_at' => now()]);

        return $this->successResponse([
            'user' => $user,
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
        ], 'Login successful');
    }

    /**
     * Get authenticated user.
     */
    public function me()
    {
        return $this->successResponse(auth()->user());
    }

    /**
     * Logout user (invalidate token).
     */
    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());

        return $this->successResponse(null, 'Successfully logged out');
    }

    /**
     * Refresh JWT token.
     */
    public function refresh()
    {
        $token = JWTAuth::refresh(JWTAuth::getToken());

        return $this->successResponse([
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => config('jwt.ttl') * 60,
        ], 'Token refreshed');
    }

    /**
     * Update user profile.
     */
    public function updateProfile(Request $request)
    {
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user->update($request->only([
            'first_name', 'last_name', 'phone', 'address',
            'city', 'state', 'zip_code', 'country'
        ]));

        return $this->successResponse($user, 'Profile updated successfully');
    }

    /**
     * Change password.
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $user = auth()->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return $this->errorResponse('Current password is incorrect', 400);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return $this->successResponse(null, 'Password changed successfully');
    }

    /**
     * Send password reset link to the given email (forgot password).
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        try {
            $status = Password::sendResetLink($request->only('email'));
        } catch (\Throwable $e) {
            $raw = trim((string) $e->getMessage());
            $safe = preg_replace('/([A-Za-z0-9+\/=]{24,})/', '[redacted]', $raw);
            $safe = substr($safe, 0, 220);
            Log::error('forgot_password_mail_failed', [
                'message' => $e->getMessage(),
                'email' => $request->input('email'),
            ]);

            return $this->errorResponse(
                'Mail send failed: ' . ($safe ?: 'Unknown transport error') . '. Check MAIL_* vars and Brevo sender/domain authorization.',
                503
            );
        }

        if ($status === Password::RESET_THROTTLED) {
            return $this->errorResponse('Please wait a minute before requesting another reset link.', 429);
        }

        if ($status === Password::RESET_LINK_SENT) {
            return $this->successResponse(
                null,
                'Check your email — we sent you a link to reset your password. If you do not see it, look in spam or promotions.'
            );
        }

        // Invalid user or other: do not confirm whether the email exists
        return $this->successResponse(
            null,
            'If that email is registered, you will receive a reset link shortly. Check your inbox and spam folder.'
        );
    }

    /**
     * Reset password using the token from the email link.
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->successResponse(null, 'Your password has been reset. You can now sign in.');
        }

        if ($status === Password::INVALID_TOKEN) {
            return $this->errorResponse('This reset link is invalid or has expired. Please request a new one.', 400);
        }

        return $this->errorResponse('Unable to reset password. Please try again or request a new link.', 400);
    }

    /**
     * Normalize FRONTEND_URL so redirects are always absolute (no leading slash).
     */
    private function getFrontendUrl(): string
    {
        $url = trim(env('FRONTEND_URL', 'http://localhost:5173'));
        $url = rtrim($url, '/');
        $url = ltrim($url, '/');
        if ($url && !preg_match('#^https?://#i', $url)) {
            $url = 'https://' . $url;
        }
        return $url ?: 'http://localhost:5173';
    }

    /**
     * Whether Google OAuth can run (both credentials set on the server).
     */
    private function isGoogleOAuthConfigured(): bool
    {
        $id = config('services.google.client_id');
        $secret = config('services.google.client_secret');

        return is_string($id) && $id !== ''
            && is_string($secret) && $secret !== '';
    }

    /**
     * Public: which social providers are available (no secrets exposed).
     */
    public function authProviders()
    {
        return $this->successResponse([
            'google' => $this->isGoogleOAuthConfigured(),
        ]);
    }

    /**
     * Redirect to Google OAuth.
     */
    public function redirectToGoogle()
    {
        if (!$this->isGoogleOAuthConfigured()) {
            return redirect($this->getFrontendUrl() . '/login?error=google_not_configured');
        }

        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Handle Google OAuth callback: find or create user, return JWT via redirect to frontend.
     */
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect($this->getFrontendUrl() . '/login?error=google_denied');
        }

        $user = User::where('google_id', $googleUser->getId())->first();

        if (!$user) {
            $user = User::where('email', $googleUser->getEmail())->first();
            if ($user) {
                $user->update(['google_id' => $googleUser->getId()]);
            } else {
                $name = $googleUser->getName();
                $parts = preg_match('/\s+/', $name)
                    ? explode(' ', $name, 2)
                    : [$name, ''];
                $user = User::create([
                    'first_name' => $parts[0] ?? $name,
                    'last_name' => $parts[1] ?? '',
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'password' => Hash::make(uniqid('google_', true)),
                    'role' => 'customer',
                    'is_active' => true,
                ]);
            }
        }

        if (!$user->is_active) {
            return redirect($this->getFrontendUrl() . '/login?error=account_deactivated');
        }

        $user->update(['last_login_at' => now()]);
        $token = JWTAuth::fromUser($user);

        return redirect($this->getFrontendUrl() . '/login?token=' . urlencode($token));
    }
}
