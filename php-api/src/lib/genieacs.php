<?php
/**
 * MLJ NET PHP API - GenieACS NBI Client
 * Connects to the same GenieACS NBI API as the Node.js backend.
 */

declare(strict_types=1);

namespace MLJNet\Lib;

class GenieACS
{
    private static ?array $cachedSettings = null;
    private static int $cachedTs = 0;
    private const CACHE_TTL = 15;

    /**
     * Get NBI URL from DB settings or env.
     */
    public static function getNbiUrl(): string
    {
        // Check DB for overridden settings
        $settings = self::getSettingsFromDb();
        return $settings['genieacs_nbi_url'] ?? Config::get('genieacs_nbi_url', 'http://127.0.0.1:7557');
    }

    /**
     * Get NBI authentication credentials.
     */
    public static function getNbiAuth(): array
    {
        $user = Config::get('genieacs_nbi_user', '');
        $pass = Config::get('genieacs_nbi_pass', '');

        if (!$user) {
            $settings = self::getSettingsFromDb();
            $user = $settings['genieacs_nbi_username'] ?? '';
            $pass = $settings['genieacs_nbi_password'] ?? '';
        }

        return ['user' => $user, 'pass' => $pass];
    }

    /**
     * Fetch from GenieACS NBI API.
     */
    public static function nbiRequest(string $path, string $method = 'GET', ?array $body = null, int $timeout = 10): array
    {
        $url = rtrim(self::getNbiUrl(), '/') . $path;
        $auth = self::getNbiAuth();

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_TIMEOUT         => $timeout,
            CURLOPT_CUSTOMREQUEST   => $method,
            CURLOPT_HTTPHEADER      => ['Content-Type: application/json', 'Accept: application/json'],
        ]);

        if ($auth['user']) {
            curl_setopt($ch, CURLOPT_USERPWD, $auth['user'] . ':' . $auth['pass']);
        }

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return ['error' => $error, 'status' => 0];
        }

        $decoded = json_decode($response ?: '[]', true) ?? [];
        return ['data' => $decoded, 'status' => $httpCode];
    }

    /**
     * Get all devices from GenieACS.
     */
    public static function getDevices(): array
    {
        return self::nbiRequest('/devices');
    }

    /**
     * Get single device details.
     */
    public static function getDevice(string $deviceId): array
    {
        return self::nbiRequest('/devices/' . urlencode($deviceId));
    }

    /**
     * Get device parameters.
     */
    public static function getDeviceParameters(string $deviceId): array
    {
        return self::nbiRequest('/devices/' . urlencode($deviceId) . '/parameters');
    }

    /**
     * Delete a device.
     */
    public static function deleteDevice(string $deviceId): array
    {
        return self::nbiRequest('/devices/' . urlencode($deviceId), 'DELETE');
    }

    /**
     * Create a task for a device.
     */
    public static function createTask(string $deviceId, string $taskName, array $taskParams = []): array
    {
        $body = ['device': $deviceId, 'name' => $taskName];
        if (!empty($taskParams)) {
            $body = array_merge($body, $taskParams);
        }
        return self::nbiRequest('/tasks', 'POST', $body);
    }

    /**
     * Get all tasks.
     */
    public static function getTasks(): array
    {
        return self::nbiRequest('/tasks');
    }

    /**
     * Delete a task.
     */
    public static function deleteTask(string $taskId): array
    {
        return self::nbiRequest('/tasks/' . urlencode($taskId), 'DELETE');
    }

    /**
     * Get server mode from DB settings.
     */
    public static function getServerMode(): string
    {
        $settings = self::getSettingsFromDb();
        return $settings['genieacs_server_mode'] ?? 'remote';
    }

    private static function getSettingsFromDb(): array
    {
        if (self::$cachedSettings !== null && (time() - self::$cachedTs) < self::CACHE_TTL) {
            return self::$cachedSettings;
        }

        try {
            $rows = Database::fetchAll('SELECT "key", value FROM "SystemSetting" WHERE category = ?', ['genieacs']);
            $map = [];
            foreach ($rows as $row) {
                $map[$row['key']] = $row['value'];
            }
            self::$cachedSettings = $map;
            self::$cachedTs = time();
            return $map;
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function invalidateCache(): void
    {
        self::$cachedSettings = null;
        self::$cachedTs = 0;
    }
}
