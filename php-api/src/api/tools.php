<?php
/**
 * MLJ NET PHP API - Network Tools
 * POST /api/php/tools/ping      - Ping a host
 * POST /api/php/tools/traceroute - Traceroute to host
 * POST /api/php/tools/dns        - DNS lookup
 * POST /api/php/tools/portcheck  - Check if port is open
 */

declare(strict_types=1);

namespace MLJNet\Api;

use MLJNet\Lib\{Config, Auth, jsonResponse, uuid, getClientIp, getClientUserAgent};

class Tools
{
    /**
     * POST /api/php/tools/ping
     */
    public static function ping(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $host = $input['host'] ?? '';
        $count = min((int)($input['count'] ?? 4), 20);

        if (!$host) {
            jsonResponse(['error' => 'Host is required'], 400);
        }

        // Validate host
        if (!filter_var($host, FILTER_VALIDATE_IP) && !filter_var($host, FILTER_VALIDATE_DOMAIN)) {
            jsonResponse(['error' => 'Invalid host'], 400);
        }

        $output = [];
        $exitCode = 0;
        $cmd = "ping -c {$count} -W 2 " . escapeshellarg($host) . " 2>&1";
        exec($cmd, $output, $exitCode);

        $success = $exitCode === 0;

        // Parse results
        $parsed = ['hosts' => [], 'stats' => null];
        foreach ($output as $line) {
            // Parse ping reply: 64 bytes from x.x.x.x: icmp_seq=1 ttl=64 time=0.5 ms
            if (preg_match('/(\d+) bytes from ([\d.]+):.*icmp_seq=(\d+).*ttl=(\d+).*time=([\d.]+)\s*ms/', $line, $m)) {
                $parsed['hosts'][] = [
                    'bytes'   => (int)$m[1],
                    'ip'      => $m[2],
                    'seq'     => (int)$m[3],
                    'ttl'     => (int)$m[4],
                    'time_ms' => (float)$m[5],
                ];
            }
            // Parse stats: rtt min/avg/max/mdev
            if (preg_match('/rtt min\/avg\/max\/mdev\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/', $line, $m)) {
                $parsed['stats'] = [
                    'min'  => (float)$m[1],
                    'avg'  => (float)$m[2],
                    'max'  => (float)$m[3],
                    'mdev' => (float)$m[4],
                ];
            }
        }

        Auth::createAuditLog([
            'userId'    => $session['id'],
            'action'    => 'tool_ping',
            'resource'  => 'tools',
            'detail'    => "Ping {$host} ({$count} packets)",
            'ipAddress' => getClientIp(),
        ]);

        jsonResponse([
            'success' => $success,
            'host'    => $host,
            'raw'     => implode("\n", $output),
            'parsed'  => $parsed,
        ]);
    }

    /**
     * POST /api/php/tools/traceroute
     */
    public static function traceroute(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $host = $input['host'] ?? '';
        $maxHops = min((int)($input['max_hops'] ?? 15), 30);

        if (!$host) {
            jsonResponse(['error' => 'Host is required'], 400);
        }

        $output = [];
        $cmd = "traceroute -n -m {$maxHops} -w 2 " . escapeshellarg($host) . " 2>&1";
        exec($cmd, $output, $exitCode);

        $hops = [];
        foreach ($output as $line) {
            // Parse: 1  192.168.1.1  0.5ms  0.3ms  0.4ms
            if (preg_match('/^\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s*ms/', $line, $m)) {
                $hops[] = [
                    'hop'     => (int)$m[1],
                    'ip'      => $m[2],
                    'time_ms' => (float)$m[3],
                ];
            } elseif (preg_match('/^\s*(\d+)\s+\*\s+\*\s+\*/', $line, $m)) {
                $hops[] = ['hop' => (int)$m[1], 'ip' => '*', 'time_ms' => null];
            }
        }

        Auth::createAuditLog([
            'userId'    => $session['id'],
            'action'    => 'tool_traceroute',
            'resource'  => 'tools',
            'detail'    => "Traceroute to {$host}",
            'ipAddress' => getClientIp(),
        ]);

        jsonResponse([
            'host'  => $host,
            'hops'  => $hops,
            'raw'   => implode("\n", $output),
        ]);
    }

    /**
     * POST /api/php/tools/dns
     */
    public static function dns(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $domain = $input['domain'] ?? '';
        $type = $input['type'] ?? 'A';

        if (!$domain) {
            jsonResponse(['error' => 'Domain is required'], 400);
        }

        $allowedTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR', 'SRV'];
        if (!in_array(strtoupper($type), $allowedTypes)) {
            jsonResponse(['error' => "Invalid DNS record type. Allowed: " . implode(', ', $allowedTypes)], 400);
        }

        $type = strtoupper($type);

        // Use dig command
        $output = [];
        $cmd = "dig +short " . escapeshellarg($domain) . " " . escapeshellarg($type) . " 2>&1";
        exec($cmd, $output);

        $records = array_filter($output, fn($l) => !empty(trim($l)));

        jsonResponse([
            'domain'  => $domain,
            'type'    => $type,
            'records' => array_values($records),
            'count'   => count($records),
        ]);
    }

    /**
     * POST /api/php/tools/portcheck
     */
    public static function portCheck(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $host = $input['host'] ?? '';
        $port = (int)($input['port'] ?? 0);
        $timeout = min((int)($input['timeout'] ?? 3), 10);

        if (!$host || $port <= 0) {
            jsonResponse(['error' => 'Host and port are required'], 400);
        }

        $start = microtime(true);
        $sock = @fsockopen($host, $port, $errno, $errstr, $timeout);
        $elapsed = round((microtime(true) - $start) * 1000);

        if ($sock) {
            fclose($sock);
            jsonResponse([
                'host'    => $host,
                'port'    => $port,
                'open'    => true,
                'latency' => $elapsed,
            ]);
        } else {
            jsonResponse([
                'host'    => $host,
                'port'    => $port,
                'open'    => false,
                'error'   => $errstr,
                'latency' => $elapsed,
            ]);
        }
    }
}