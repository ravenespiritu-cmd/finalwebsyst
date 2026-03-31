<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->ensureDatabaseUrlForRailway();

        // Railway (and other HTTPS terminators) forward requests as HTTP; force https:// for url() / asset URLs
        // so storage links are not http:// (mixed content on the SPA).
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Password reset link should point to the frontend SPA
        ResetPassword::createUrlUsing(function ($notifiable, $token) {
            $email = urlencode($notifiable->getEmailForPasswordReset());
            return rtrim(config('app.frontend_url'), '/') . '/reset-password?token=' . $token . '&email=' . $email;
        });
    }

    /**
     * When DATABASE_URL and MYSQL_URL are not set (e.g. Railway only injects DB_* or MYSQLHOST etc.),
     * build a mysql:// URL from components so Laravel uses a single connection string.
     */
    protected function ensureDatabaseUrlForRailway(): void
    {
        $url = config('database.connections.mysql.url');
        if (!empty($url)) {
            return;
        }
        $host = env('DB_HOST', env('MYSQLHOST', env('MYSQL_HOST')));
        $port = env('DB_PORT', env('MYSQLPORT', env('MYSQL_PORT', '3306')));
        $database = env('DB_DATABASE', env('MYSQLDATABASE', env('MYSQL_DATABASE')));
        $username = env('DB_USERNAME', env('MYSQLUSER', env('MYSQL_USER')));
        $password = env('DB_PASSWORD', env('MYSQLPASSWORD', env('MYSQL_PASSWORD')));

        if (empty($host) || empty($database) || $username === null) {
            return;
        }
        $password = $password !== null ? rawurlencode($password) : '';
        $built = "mysql://{$username}:{$password}@{$host}:{$port}/{$database}";
        config(['database.connections.mysql.url' => $built]);
    }
}
