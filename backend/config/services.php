<?php

return [

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI')
            ?: (rtrim((string) (env('APP_URL') ?: 'http://localhost'), '/') . '/api/v1/auth/google/callback'),
    ],

    'paymongo' => [
        'base_url' => env('PAYMONGO_BASE_URL', 'https://api.paymongo.com/v1'),
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
        'verify_ssl' => env('PAYMONGO_VERIFY_SSL', true),
    ],

];
