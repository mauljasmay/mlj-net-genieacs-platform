<?php
/**
 * MLJ NET PHP API - System Health Check
 * GET /api/php/system - Check all services status
 * GET /api/php/system/info - System information
 */

declare(strict_types=1);

namespace MLJNet\Api;

use MLJNet\Lib\{Config, Database, Auth, GenieACS, jsonResponse};

class System
{
    /**
     * GET /api/php/system - Full service health check (same as Node.js /api/system but via PHP)
     */
    public static function health(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $nbiUrl = GenieACS::getNbiUrl();
        $nbiIsHttps = str_starts_with($nbiUrl, 'https://');
        $nbiProto = $nbiIsHttps ? 'https' : 'http';
        $nbiHost = preg_replace('#^https?://#', '', $nbiUrl);
        $nbiHost = explode(':', $nbiHost)[0] ?? '127.0.0.1';
        $nbiPort = explode(':', $nbiUrl);
        $nbiPort = (int)end($nbiPort) ?: 7557;

        // Get CWMP settings from DB
        $settings = Database::getSettingsByCategory('genieacs');
        $map = [];
        foreach ($settings as $s) {
            $map[$s['key']] = $s['value'];
        }
        $cwmpHost = $map['genieacs_cwmp_host'] ?? '127.0.0.1';
        $cwmpPort = (int)($map['genieacs_cwmp_port'] ?? 7547);
        $fsPort = (int)($map['genieacs_fs_port'] ?? 7567);

        $services = [
            ['name' => 'NBI API', 'host' => $nbiHost, 'port' => $nbiPort, 'proto' => $nbiProto],
            ['name' => 'CWMP / TR-069', 'host' => $cwmpHost, 'port' => $cwmpPort, 'proto' => 'http'],
            ['name' => 'File Server', 'host' => $nbiHost, 'port' => $fsPort, 'proto' => 'http'],
        ];

        $results = [];
        foreach ($services as $svc) {
            $start = microtime(true);
            $status = 'offline';
            $responseTime = -1;

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL            => "{$svc['proto']}://{$svc['host']}:{$svc['port']}/",
                CURLOPT_RETURNTRANSFER  => true,
                CURLOPT_TIMEOUT         => 3,
                CURLOPT_NOBODY          => true,
            ]);
            if (curl_exec($ch) !== false) {
                $status = 'online';
                $responseTime = (int)((microtime(true) - $start) * 1000);
            }
            curl_close($ch);

            $results[] = [
                'name'         => $svc['name'],
                'host'         => $svc['host'],
                'port'         => $svc['port'],
                'proto'        => $svc['proto'],
                'status'       => $status,
                'responseTime' => $responseTime,
            ];
        }

        // Dashboard is online if PHP responds
        array_unshift($results, [
            'name'         => 'Dashboard (PHP)',
            'host'         => '127.0.0.1',
            'port'         => 9000,
            'proto'        => 'http',
            'status'       => 'online',
            'responseTime' => 0,
        ]);

        $serverMode = $map['genieacs_server_mode'] ?? 'remote';

        jsonResponse(['services' => $results, 'serverMode' => $serverMode]);
    }

    /**
     * GET /api/php/system/info - System information (CPU, RAM, disk, etc.)
     */
    public static function info(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $info = [];

        // OS info
        $info['os'] = php_uname('s') . ' ' . php_uname('r') . ' ' . php_uname('m');
        $info['hostname'] = php_uname('n');
        $info['php_version'] = PHP_VERSION;

        // CPU usage
        $cpuLoad = sys_getloadavg();
        $info['cpu_load'] = [
            '1min'  => round($cpuLoad[0] ?? 0, 2),
            '5min'  => round($cpuLoad[1] ?? 0, 2),
            '15min' => round($cpuLoad[2] ?? 0, 2),
        ];
        $info['cpu_count'] = (int)shell_exec('nproc 2>/dev/null') ?: 1;

        // Memory
        $memRaw = file_get_contents('/proc/meminfo');
        preg_match('/MemTotal:\s+(\d+)/', $memRaw, $mt);
        preg_match('/MemAvailable:\s+(\d+)/', $memRaw, $ma);
        $totalMem = (int)($mt[1] ?? 0) * 1024;
        $availMem = (int)($ma[1] ?? 0) * 1024;
        $info['memory'] = [
            'total'     => $totalMem,
            'available' => $availMem,
            'used'      => $totalMem - $availMem,
            'percent'   => $totalMem > 0 ? round(($totalMem - $availMem) / $totalMem * 100, 1) : 0,
        ];

        // Disk
        $df = disk_total_space('/');
        $dfFree = disk_free_space('/');
        $info['disk'] = [
            'total'   => $df,
            'free'    => $dfFree,
            'used'    => $df - $dfFree,
            'percent' => $df > 0 ? round(($df - $dfFree) / $df * 100, 1) : 0,
        ];

        // Uptime
        $uptimeRaw = @file_get_contents('/proc/uptime');
        if ($uptimeRaw) {
            $uptimeSec = (float)explode(' ', $uptimeRaw)[0];
            $days = floor($uptimeSec / 86400);
            $hours = floor(($uptimeSec % 86400) / 3600);
            $mins = floor(($uptimeSec % 3600) / 60);
            $info['uptime'] = "{$days}d {$hours}h {$mins}m";
            $info['uptime_seconds'] = (int)$uptimeSec;
        }

        // Service statuses
        $services = ['mongod', 'genieacs-cwmp', 'genieacs-nbi', 'genieacs-fs', 'caddy', 'php8.2-fpm'];
        $info['services'] = [];
        foreach ($services as $svc) {
            $status = shell_exec("systemctl is-active $svc 2>/dev/null") ?: 'unknown';
            $info['services'][$svc] = trim($status);
        }

        // Network interfaces
        $info['network'] = [];
        $ifconfig = @shell_exec("ip -j addr show 2>/dev/null");
        if ($ifconfig) {
            $interfaces = json_decode($ifconfig, true) ?: [];
            foreach ($interfaces as $iface) {
                $name = $iface['ifname'] ?? '';
                if (in_array($name, ['lo'], true)) continue;
                $ipv4 = '';
                foreach ($iface['addr_info'] ?? [] as $addr) {
                    if (($addr['family'] ?? '') === 'inet') {
                        $ipv4 = $addr['local'] ?? '';
                        break;
                    }
                }
                $info['network'][] = [
                    'name'   => $name,
                    'state'  => $iface['operstate'] ?? 'unknown',
                    'ipv4'   => $ipv4,
                    'mac'    => $iface['address'] ?? '',
                    'mtu'    => (int)($iface['mtu'] ?? 1500),
                ];
            }
        }

        jsonResponse(['info' => $info]);
    }
}
