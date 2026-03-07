<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * For API requests, do not expose internal errors (e.g. DB connection) when debug is off.
     */
    public function render($request, Throwable $e): Response
    {
        $response = parent::render($request, $e);
        if ($request->is('api/*') && !config('app.debug') && $response->getStatusCode() >= 500) {
            return response()->json([
                'success' => false,
                'message' => 'A server error occurred. Please try again later.',
            ], 500);
        }
        return $response;
    }
}
