<?php
/**
 * MLJ NET PHP API - Network Management via MikroTik
 * GET /api/php/network/pppoe     - PPPoE active sessions
 * GET /api/php/network/hotspot   - Hotspot active users
 * GET /api/php/network/interfaces - Interface traffic stats
 * GET /api/php/network/arp       - ARP table
 */

declare(strict_types=1);

namespace MLJNet\Api;

use MLJNet\Lib\{Config, Database, Auth, MikroTik, jsonResponse, getClientIp, getClientUserAgent, formatBytes, formatDuration};

class Network
{
    /**
     * GET /api/php/network/pppoe - PPPoE active sessions via MikroTik
     */
    public static function pppoe(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        try {
            $entries = MikroTik::getPppoeActive();

            $sessions = [];
            foreach ($entries as $entry) {
                $sessions[] = [
                    'name'      => $entry['name'] ?? '',
                    'caller_id' => $entry['caller-id'] ?? '',
                    'address'   => $entry['address'] ?? '',
                    'uptime'    => $entry['uptime'] ?? '',
                ];
            }

            jsonResponse([
                'total'    => count($sessions),
                'sessions' => $sessions,
            ]);
        } catch (\Throwable $e) {
            jsonResponse(['error' => 'MikroTik connection failed: ' . $e->getMessage()], 502);
        }
    }

    /**
     * GET /api/php/network/hotspot - Hotspot active users via MikroTik
     */
    public static function hotspot(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        try {
            $entries = MikroTik::getHotspotActive();

            $users = [];
            foreach ($entries as $entry) {
                $users[] = [
                    'user'       => $entry['user'] ?? '',
                    'address'    => $entry['address'] ?? '',
                    'mac'        => $entry['mac-address'] ?? '',
                    'uptime'     => $entry['uptime'] ?? '',
                    'time_left'  => $entry['session-time-left'] ?? '',
                ];
            }

            jsonResponse([
                'total' => count($users),
                'users' => $users,
            ]);
        } catch (\Throwable $e) {
            jsonResponse(['error' => 'MikroTik connection failed: ' . $e->getMessage()], 502);
        }
    }

    /**
     * GET /api/php/network/interfaces - Interface traffic stats
     */
    public static function interfaces(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        try {
            $entries = MikroTik::getInterfaceTraffic();

            $ifaces = [];
            foreach ($entries as $entry) {
                $ifaces[] = [
                    'name'       => $entry['name'] ?? '',
                    'type'       => $entry['type'] ?? '',
                    'running'    => ($entry['running'] ?? '') === 'true',
                    'tx_bytes'   => (int)($entry['tx-byte'] ?? 0),
                    'rx_bytes'   => (int)($entry['rx-byte'] ?? 0),
                    'tx_bps'     => (int)($entry['tx-bits-per-second'] ?? 0),
                    'rx_bps'     => (int)($entry['rx-bits-per-second'] ?? 0),
                    'tx_hr'      => formatBytes((int)($entry['tx-byte'] ?? 0)),
                    'rx_hr'      => formatBytes((int)($entry['rx-byte'] ?? 0)),
                ];
            }

            jsonResponse(['interfaces' => $ifaces]);
        } catch (\Throwable $e) {
            jsonResponse(['error' => 'MikroTik connection failed: ' . $e->getMessage()], 502);
        }
    }

    /**
     * GET /api/php/network/arp - ARP table from MikroTik
     */
    public static function arp(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        try {
            $entries = MikroTik::command('/ip/arp/print', [
                'proplist' => 'address,mac-address,interface,complete,status'
            ]);

            $arpTable = [];
            foreach ($entries as $entry) {
                $arpTable[] = [
                    'ip'        => $entry['address'] ?? '',
                    'mac'       => $entry['mac-address'] ?? '',
                    'interface' => $entry['interface'] ?? '',
                    'complete'  => ($entry['complete'] ?? '') === 'true',
                    'status'    => $entry['status'] ?? '',
                ];
            }

            jsonResponse([
                'total' => count($arpTable),
                'entries' => $arpTable,
            ]);
        } catch (\Throwable $e) {
            jsonResponse(['error' => 'MikroTik connection failed: ' . $e->getMessage()], 502);
        }
    }
}