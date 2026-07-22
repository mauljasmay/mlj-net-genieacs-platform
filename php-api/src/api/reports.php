<?php
/**
 * MLJ NET PHP API - Reports
 * GET /api/php/reports/devices - Device inventory report
 * GET /api/php/reports/audit   - Audit log report (filterable)
 * GET /api/php/reports/users   - User activity report
 */

declare(strict_types=1);

namespace MLJNet\Api;

use MLJNet\Lib\{Config, Database, Auth, GenieACS, jsonResponse, getClientIp};

class Reports
{
    /**
     * GET /api/php/reports/devices - Device inventory report from GenieACS
     */
    public static function devices(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $result = GenieACS::getDevices();
        $devices = $result['data'] ?? [];

        $report = [
            'generated_at' => date('c'),
            'total'        => count($devices),
            'online'       => 0,
            'offline'      => 0,
            'manufacturers' => [],
            'models'       => [],
            'devices'      => [],
        ];

        foreach ($devices as $d) {
            $deviceId = $d['_id'] ?? '';
            $lastInform = $d['_lastInform'] ?? null;
            $isOnline = $lastInform && (strtotime($lastInform) > time() - 600);

            if ($isOnline) {
                $report['online']++;
            } else {
                $report['offline']++;
            }

            $manufacturer = $d['_deviceId']['_Manufacturer'] ?? 'Unknown';
            $model = $d['_deviceId']['_ProductClass'] ?? 'Unknown';
            $serial = $d['_deviceId']['_SerialNumber'] ?? '';
            $oui = $d['_deviceId']['_OUI'] ?? '';

            // Count by manufacturer
            if (!isset($report['manufacturers'][$manufacturer])) {
                $report['manufacturers'][$manufacturer] = 0;
            }
            $report['manufacturers'][$manufacturer]++;

            // Count by model
            $modelKey = $manufacturer . ' / ' . $model;
            if (!isset($report['models'][$modelKey])) {
                $report['models'][$modelKey] = 0;
            }
            $report['models'][$modelKey]++;

            $report['devices'][] = [
                'id'           => $deviceId,
                'serial'       => $serial,
                'manufacturer' => $manufacturer,
                'model'        => $model,
                'oui'          => $oui,
                'last_inform'  => $lastInform,
                'status'       => $isOnline ? 'online' : 'offline',
                'tags'         => $d['_tags'] ?? [],
            ];
        }

        // Sort manufacturers by count descending
        arsort($report['manufacturers']);
        arsort($report['models']);

        jsonResponse($report);
    }

    /**
     * GET /api/php/reports/audit - Audit log report (filterable)
     * Query params: ?page=1&limit=50&action=&userId=&from=&to=
     */
    public static function audit(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        // Only superadmin/admin can view audit logs
        if (!Auth::requireRole($session, ['superadmin', 'admin'])) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }

        $page     = max(1, (int)($_GET['page'] ?? 1));
        $limit    = min(200, max(10, (int)($_GET['limit'] ?? 50)));
        $offset   = ($page - 1) * $limit;
        $action   = $_GET['action'] ?? '';
        $userId   = $_GET['userId'] ?? '';
        $from     = $_GET['from'] ?? '';
        $to       = $_GET['to'] ?? '';

        $where = [];
        $params = [];

        if ($action) {
            $where[] = 'a.action LIKE ?';
            $params[] = '%' . $action . '%';
        }
        if ($userId) {
            $where[] = 'a."userId" = ?';
            $params[] = $userId;
        }
        if ($from) {
            $where[] = 'a."createdAt" >= ?';
            $params[] = $from;
        }
        if ($to) {
            $where[] = 'a."createdAt" <= ?';
            $params[] = $to;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        // Count total
        $countSql = 'SELECT COUNT(*) as cnt FROM "AuditLog" a ' . $whereClause;
        $countRow = Database::fetchOne($countSql, $params);
        $total = (int)($countRow['cnt'] ?? 0);

        // Fetch page
        $sql = '
            SELECT a.*, u.username, u."displayName"
            FROM "AuditLog" a
            LEFT JOIN "User" u ON u.id = a."userId"
            ' . $whereClause . '
            ORDER BY a."createdAt" DESC
            LIMIT ? OFFSET ?
        ';
        $params[] = $limit;
        $params[] = $offset;

        $rows = Database::fetchAll($sql, $params);

        $logs = [];
        foreach ($rows as $row) {
            $logs[] = [
                'id'         => $row['id'],
                'userId'     => $row['userId'],
                'username'   => $row['username'] ?? 'system',
                'displayName'=> $row['displayName'] ?? '',
                'action'     => $row['action'],
                'resource'   => $row['resource'] ?? '',
                'detail'     => $row['detail'] ?? '',
                'ipAddress'  => $row['ipAddress'] ?? '',
                'userAgent'  => $row['userAgent'] ?? '',
                'createdAt'  => $row['createdAt'] ?? '',
            ];
        }

        // Summary stats
        $statsSql = '
            SELECT action, COUNT(*) as cnt
            FROM "AuditLog"
            GROUP BY action
            ORDER BY cnt DESC
            LIMIT 20
        ';
        $stats = Database::fetchAll($statsSql);
        $actionStats = [];
        foreach ($stats as $s) {
            $actionStats[$s['action']] = (int)$s['cnt'];
        }

        jsonResponse([
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'totalPages'  => (int)ceil($total / $limit),
            'logs'        => $logs,
            'actionStats' => $actionStats,
        ]);
    }

    /**
     * GET /api/php/reports/users - User activity report
     */
    public static function users(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        if (!Auth::requireRole($session, ['superadmin', 'admin'])) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }

        // Get all users
        $users = Database::fetchAll('
            SELECT id, username, "displayName", role, "isActive", "lastLoginAt", "lastLoginIp", "createdAt"
            FROM "User"
            ORDER BY "createdAt" DESC
        ');

        $report = [];
        foreach ($users as $u) {
            // Count sessions for this user
            $sessionCount = Database::fetchOne('
                SELECT COUNT(*) as cnt FROM "Session" WHERE "userId" = ?
            ', [$u['id']]);

            // Count audit entries for this user
            $auditCount = Database::fetchOne('
                SELECT COUNT(*) as cnt FROM "AuditLog" WHERE "userId" = ?
            ', [$u['id']]);

            // Count failed login attempts
            $failedLogins = Database::fetchOne('
                SELECT COUNT(*) as cnt FROM "LoginAttempt"
                WHERE username = ? AND success = 0
            ', [$u['username']]);

            $report[] = [
                'id'            => $u['id'],
                'username'      => $u['username'],
                'displayName'   => $u['displayName'] ?? '',
                'role'          => $u['role'],
                'isActive'      => (bool)$u['isActive'],
                'lastLoginAt'   => $u['lastLoginAt'],
                'lastLoginIp'   => $u['lastLoginIp'] ?? '',
                'createdAt'     => $u['createdAt'],
                'sessionCount'  => (int)($sessionCount['cnt'] ?? 0),
                'auditCount'    => (int)($auditCount['cnt'] ?? 0),
                'failedLogins'  => (int)($failedLogins['cnt'] ?? 0),
            ];
        }

        jsonResponse([
            'generated_at' => date('c'),
            'total'        => count($report),
            'users'        => $report,
        ]);
    }
}
