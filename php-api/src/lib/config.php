<?php
/**
 * MLJ NET PHP API - Configuration
 * Reads from config/.env or falls back to defaults.
 * Shares the same SQLite database and secrets as the Node.js backend.
 */

declare(strict_types=1);

namespace MLJNet\Lib;

use Dotenv\Dotenv;

class Config
{
    private static ?array $values = null;
    private static ?\Monolog\Logger $logger = null;

    public static function init(): void
    {
        if (self::$values !== null) {
            return;
        }

        // Base path: php-api/
        $baseDir = dirname(__DIR__, 2);

        // Try loading .env from config/
        $envFile = $baseDir . '/config/.env';
        if (file_exists($envFile)) {
            try {
                $dotenv = Dotenv::createImmutable($baseDir . '/config');
                $dotenv->load();
            } catch (\Throwable $e) {
                // Non-fatal: we'll use defaults
            }
        }

        // Also try loading from parent project .env (shared with Node.js)
        $parentEnv = $baseDir . '/../.env';
        if (file_exists($parentEnv)) {
            try {
                $dotenv = Dotenv::createImmutable($baseDir . '/..');
                $dotenv->safeLoad();
            } catch (\Throwable $e) {
                // Non-fatal
            }
        }

        self::$values = [
            // Database
            'db_path'            => self::resolveDbPath(),

            // JWT
            'jwt_secret'         => getenv('JWT_SECRET') ?: 'change-this-to-a-random-secret',
            'session_secret'     => getenv('SESSION_SECRET') ?: 'change-this-to-a-random-secret',

            // GenieACS
            'genieacs_nbi_url'   => getenv('GENIEACS_NBI_URL') ?: 'http://127.0.0.1:7557',
            'genieacs_nbi_user'  => getenv('GENIEACS_NBI_USERNAME') ?: '',
            'genieacs_nbi_pass'  => getenv('GENIEACS_NBI_PASSWORD') ?: '',
            'genieacs_cwmp_port' => (int)(getenv('GENIEACS_CWMP_PORT') ?: 7547),
            'genieacs_nbi_port'  => (int)(getenv('GENIEACS_NBI_PORT') ?: 7557),
            'genieacs_fs_port'   => (int)(getenv('GENIEACS_FS_PORT') ?: 7567),

            // MikroTik
            'mikrotik_host'      => getenv('MIKROTIK_HOST') ?: '192.168.1.1',
            'mikrotik_port'      => (int)(getenv('MIKROTIK_PORT') ?: 8728),
            'mikrotik_user'      => getenv('MIKROTIK_USERNAME') ?: 'admin',
            'mikrotik_pass'      => getenv('MIKROTIK_PASSWORD') ?: '',

            // App
            'app_env'            => getenv('APP_ENV') ?: getenv('NODE_ENV') ?: 'production',
            'app_debug'          => filter_var(getenv('APP_DEBUG') ?: 'false', FILTER_VALIDATE_BOOLEAN),
            'log_path'           => getenv('LOG_PATH') ?: null,

            // Timezone
            'timezone'           => getenv('TZ') ?: 'UTC',
        ];
    }

    private static function resolveDbPath(): string
    {
        $dbUrl = getenv('DATABASE_URL') ?: '';

        // Parse file:./db/custom.db or file:/absolute/path
        if (preg_match('#^file:(.+)#', $dbUrl, $m)) {
            $path = $m[1];
            if (!str_starts_with($path, '/')) {
                // Relative to project root (parent of php-api/)
                $projectRoot = dirname(__DIR__, 2) . '/..';
                $path = realpath($projectRoot . '/' . $path);
                if (!$path) {
                    $path = $projectRoot . '/' . $m[1];
                }
            }
            return $path;
        }

        // Fallback: look for db/custom.db relative to project root
        $projectRoot = dirname(__DIR__, 2) . '/..';
        return $projectRoot . '/db/custom.db';
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::init();
        return self::$values[$key] ?? $default;
    }

    public static function all(): array
    {
        self::init();
        return self::$values;
    }

    public static function isDebug(): bool
    {
        return self::get('app_debug', false);
    }

    public static function logger(): \Monolog\Logger
    {
        if (self::$logger !== null) {
            return self::$logger;
        }

        self::$logger = new \Monolog\Logger('mljnet-php');

        $logPath = self::get('log_path');
        if ($logPath) {
            $dir = dirname($logPath);
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            self::$logger->pushHandler(new \Monolog\Handler\StreamHandler($logPath, \Monolog\Logger::DEBUG));
        }

        if (self::isDebug()) {
            self::$logger->pushHandler(new \Monolog\Handler\StreamHandler('php://stderr', \Monolog\Logger::DEBUG));
        }

        return self::$logger;
    }
}
