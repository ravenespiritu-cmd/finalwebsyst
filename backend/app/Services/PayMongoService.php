<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PayMongoService
{
    protected string $baseUrl;
    protected string $secretKey;
    protected bool $verifySsl;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.paymongo.base_url', 'https://api.paymongo.com/v1'), '/');
        $this->secretKey = (string) config('services.paymongo.secret_key', '');
        $verifySsl = config('services.paymongo.verify_ssl', true);
        $this->verifySsl = filter_var($verifySsl, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($this->verifySsl === null) {
            $this->verifySsl = true;
        }
    }

    public function isConfigured(): bool
    {
        return $this->secretKey !== '';
    }

    public function createCheckoutSession(array $payload): array
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('PayMongo is not configured. Missing PAYMONGO_SECRET_KEY.');
        }

        try {
            $http = Http::withBasicAuth($this->secretKey, '')
                ->acceptJson()
                ->timeout(30)
                ->connectTimeout(15)
                ->retry(2, 300)
                ->withOptions([
                    'verify' => $this->verifySsl,
                    // Windows/dev environments may fail on IPv6 resolution for some APIs.
                    // For PayMongo calls, force IPv4 to avoid "Connection refused" on AAAA routes.
                    'curl' => defined('CURLOPT_IPRESOLVE') && defined('CURL_IPRESOLVE_V4')
                        ? [
                            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                            // Bypass machine-level proxy settings that can break direct API calls locally.
                            CURLOPT_PROXY => '',
                            CURLOPT_NOPROXY => '*',
                        ]
                        : [
                            CURLOPT_PROXY => '',
                            CURLOPT_NOPROXY => '*',
                        ],
                ]);

            $response = $http->post($this->baseUrl . '/checkout_sessions', [
                'data' => [
                    'attributes' => $payload,
                ],
            ]);
        } catch (\Throwable $e) {
            $errorMessage = $e->getMessage();
            Log::error('PayMongo request failed before response', ['error' => $errorMessage]);
            if (str_contains($errorMessage, 'cURL error 60')) {
                throw new RuntimeException('SSL certificate validation failed while connecting to PayMongo. For local development, set PAYMONGO_VERIFY_SSL=false and restart backend.');
            }
            throw new RuntimeException('Unable to connect to PayMongo. Please check internet/firewall/proxy settings and try again.');
        }

        if (!$response->successful()) {
            Log::error('PayMongo checkout session failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Failed to create PayMongo checkout session: ' . $response->body());
        }

        return $response->json();
    }
}

