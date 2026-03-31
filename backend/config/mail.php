<?php

return [

    'default' => env('MAIL_MAILER', 'smtp'),

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'host' => (function () {
                $raw = trim((string) env('MAIL_HOST', 'smtp.mailgun.org'));
                // Railway sometimes stores values with quotes; normalize them.
                $raw = trim($raw, " \t\n\r\0\x0B\"'");
                // Some deployments accidentally set MAIL_HOST like "smtp-relay.brevo.com:587".
                // Strip the ":port" portion so PHP's SMTP host is valid.
                if (preg_match('/^(.+):(\d+)$/', $raw, $m)) {
                    return $m[1];
                }
                return $raw;
            })(),
            'port' => (function () {
                $rawHost = trim((string) env('MAIL_HOST', 'smtp.mailgun.org'));
                $rawHost = trim($rawHost, " \t\n\r\0\x0B\"'");
                $rawPort = (int) env('MAIL_PORT', 587);
                if (preg_match('/^(.+):(\d+)$/', $rawHost, $m)) {
                    return (int) $m[2];
                }
                return $rawPort;
            })(),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => env('MAIL_TIMEOUT', 15),
            'auth_mode' => null,
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'mailgun' => [
            'transport' => 'mailgun',
        ],

        'postmark' => [
            'transport' => 'postmark',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => env('MAIL_SENDMAIL_PATH', '/usr/sbin/sendmail -t -i'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
        ],
    ],

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'hello@gandahub.com'),
        'name' => env('MAIL_FROM_NAME', 'Ganda Hub Cosmetics'),
    ],

    'markdown' => [
        'theme' => 'default',

        'paths' => [
            resource_path('views/vendor/mail'),
        ],
    ],

];
