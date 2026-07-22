<?php
/**
 * MLJ NET PHP API - MikroTik RouterOS API Client
 * Connects to MikroTik routers via the RouterOS API protocol (TCP socket).
 */

declare(strict_types=1);

namespace MLJNet\Lib;

class MikroTik
{
    private static ?array $cachedConfig = null;
    private static int $cachedTs = 0;
    private const CACHE_TTL = 15;

    /**
     * Get MikroTik config from DB or env (same as Node.js).
     */
    public static function getConfig(): array
    {
        if (self::$cachedConfig !== null && (time() - self::$cachedTs) < self::CACHE_TTL) {
            return self::$cachedConfig;
        }

        try {
            $rows = Database::fetchAll('SELECT "key", value FROM "SystemSetting" WHERE category = ?', ['mikrotik']);
            $map = [];
            foreach ($rows as $row) {
                $map[$row['key']] = $row['value'];
            }

            self::$cachedConfig = [
                'host'     => $map['mikrotik_host'] ?? Config::get('mikrotik_host', '192.168.1.1'),
                'port'     => (int)($map['mikrotik_port'] ?? Config::get('mikrotik_port', 8728)),
                'username' => $map['mikrotik_username'] ?? Config::get('mikrotik_user', 'admin'),
                'password' => $map['mikrotik_password'] ?? Config::get('mikrotik_pass', ''),
            ];
            self::$cachedTs = time();
            return self::$cachedConfig;
        } catch (\Throwable $e) {
            return [
                'host'     => Config::get('mikrotik_host', '192.168.1.1'),
                'port'     => (int)Config::get('mikrotik_port', 8728),
                'username' => Config::get('mikrotik_user', 'admin'),
                'password' => Config::get('mikrotik_pass', ''),
            ];
        }
    }

    /**
     * Connect to MikroTik via RouterOS API.
     */
    public static function connect(): mixed
    {
        $config = self::getConfig();
        $sock = @fsockopen($config['host'], $config['port'], $errno, $errstr, 5);
        if (!$sock) {
            throw new \RuntimeException("Cannot connect to MikroTik at {$config['host']}:{$config['port']}: $errstr");
        }

        // Login
        self::writeWord($sock, '/login');
        self::writeWord($sock, '=name=' . $config['username']);
        self::writeWord($sock, '=password=' . $config['password']);
        self::writeEol($sock);

        $response = self::readResponse($sock);
        if (isset($response[0]['!done'])) {
            if (isset($response[0]['!done']['ret']) && $response[0]['!done']['ret'] !== '') {
                // Challenge-response login
                $challenge = $response[0]['!done']['ret'];
                $hash = md5(chr(0) . $config['password'] . pack('H*', $challenge));
                self::writeWord($sock, '/login');
                self::writeWord($sock, '=name=' . $config['username']);
                self::writeWord($sock, '=response=00' . $hash);
                self::writeEol($sock);
                $response = self::readResponse($sock);
            }
        }

        if (isset($response[0]['!trap'])) {
            fclose($sock);
            throw new \RuntimeException('MikroTik login failed: ' . ($response[0]['!trap']['message'] ?? 'Unknown error'));
        }

        return $sock;
    }

    /**
     * Execute a command on MikroTik.
     */
    public static function command(string $cmd, array $params = []): array
    {
        $sock = self::connect();
        try {
            self::writeWord($sock, $cmd);
            foreach ($params as $key => $val) {
                self::writeWord($sock, '=' . $key . '=' . $val);
            }
            self::writeEol($sock);

            $response = self::readResponse($sock);
            // Remove !done entries
            return array_values(array_filter($response, fn($r) => !isset($r['!done'])));
        } finally {
            fclose($sock);
        }
    }

    /**
     * Test connection to MikroTik.
     */
    public static function testConnection(): array
    {
        try {
            $sock = self::connect();
            self::writeWord($sock, '/system/identity/print');
            self::writeEol($sock);
            $response = self::readResponse($sock);
            fclose($sock);

            $identity = $response[0]['name'] ?? 'Unknown';
            return ['success' => true, 'identity' => $identity];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get PPPoE active sessions.
     */
    public static function getPppoeActive(): array
    {
        return self::command('/ppp/active/print', ['proplist' => 'name,caller-id,address,uptime,session-id']);
    }

    /**
     * Get Hotspot active users.
     */
    public static function getHotspotActive(): array
    {
        return self::command('/ip/hotspot/active/print', ['proplist' => 'user,address,mac-address,uptime,session-time-left']);
    }

    /**
     * Get interface traffic.
     */
    public static function getInterfaceTraffic(): array
    {
        return self::command('/interface/print', [
            'proplist' => 'name,type,running,tx-byte,rx-byte,tx-bits-per-second,rx-bits-per-second'
        ]);
    }

    // --- RouterOS API protocol helpers ---

    private static function writeWord(mixed $sock, string $word): void
    {
        $len = strlen($word);
        if ($len < 0x80) {
            fwrite($sock, chr($len));
        } elseif ($len < 0x4000) {
            $len |= 0x8000;
            fwrite($sock, chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
        } elseif ($len < 0x200000) {
            $len |= 0xC00000;
            fwrite($sock, chr(($len >> 16) & 0xFF) . chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
        } elseif ($len < 0x10000000) {
            $len |= 0xE0000000;
            fwrite($sock, chr(($len >> 24) & 0xFF) . chr(($len >> 16) & 0xFF) . chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
        } else {
            fwrite($sock, chr(0xF0) . chr(($len >> 24) & 0xFF) . chr(($len >> 16) & 0xFF) . chr(($len >> 8) & 0xFF) . chr($len & 0xFF));
        }
        fwrite($sock, $word);
    }

    private static function writeEol(mixed $sock): void
    {
        fwrite($sock, chr(0));
    }

    private static function readWord(mixed $sock): ?string
    {
        $byte = ord(fread($sock, 1));
        if ($byte === 0) return null; // Empty word = end of sentence

        if ($byte < 0x80) {
            $len = $byte;
        } elseif ($byte < 0xC0) {
            $len = (($byte & 0x3F) << 8) + ord(fread($sock, 1));
        } elseif ($byte < 0xE0) {
            $len = (($byte & 0x1F) << 16) + (ord(fread($sock, 1)) << 8) + ord(fread($sock, 1));
        } elseif ($byte < 0xF0) {
            $len = (($byte & 0x0F) << 24) + (ord(fread($sock, 1)) << 16) + (ord(fread($sock, 1)) << 8) + ord(fread($sock, 1));
        } else {
            $len = (ord(fread($sock, 1)) << 24) + (ord(fread($sock, 1)) << 16) + (ord(fread($sock, 1)) << 8) + ord(fread($sock, 1));
        }

        if ($len === 0) return '';
        return fread($sock, $len);
    }

    private static function readResponse(mixed $sock): array
    {
        $response = [];
        $sentence = [];

        while (true) {
            $word = self::readWord($sock);
            if ($word === null) {
                if (!empty($sentence)) {
                    $response[] = $sentence;
                    $sentence = [];
                }
                // Read next status byte
                $statusByte = ord(fread($sock, 1));
                if ($statusByte === 0) break; // !done
            } elseif (str_starts_with($word, '!')) {
                // Special word (e.g., !done, !trap, !re)
                if (!empty($word) && $word[0] === '!') {
                    // Parse =key=value from the word
                    $sentence[$word] = true;
                }
            } else {
                // Key=value pair
                if (str_contains($word, '=')) {
                    $eqPos = strpos($word, '=', 1);
                    if ($eqPos !== false) {
                        $key = substr($word, 1, $eqPos - 1);
                        $val = substr($word, $eqPos + 1);
                        $sentence[$key] = $val;
                    }
                }
            }
        }

        return $response;
    }

    public static function invalidateCache(): void
    {
        self::$cachedConfig = null;
        self::$cachedTs = 0;
    }
}
