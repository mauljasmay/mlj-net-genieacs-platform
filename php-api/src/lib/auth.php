<?php
/**
 * MLJ NET PHP API - Authentication
 * Shared JWT/session verification with the Node.js backend.
 * PHP reads the same session tokens from the shared SQLite database.
 */

declare(strict_types=1);

namespace MLJNet\Lib;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class Auth
{
    /**
     * Verify session from cookie token.
     * Looks up the session in the shared SQLite database (same as Node.js).
     */
    public static function verifySession(?string $token): ?array
    {
        if (!$token) {
            return null;
        }

        try {
            $db = Database::getInstance();
            $stmt = $db->prepare('
                SELECT s.*, u.username, u."displayName", u.role, u.permissions, u.isActive
                FROM "Session" s
                JOIN "User" u ON u.id = s."userId"
                WHERE s.token = ? AND s."expiresAt" > datetime("now")
                  AND u.isActive = 1
            ');
            $stmt->bindValue(1, $token);
            $result = $stmt->execute();
            if (!$result) return null;

            $row = $result->fetchArray(SQLITE3_ASSOC);
            $result->finalize();

            if (!$row) {
                return null;
            }

            return [
                'id'           => $row['userId'],
                'username'     => $row['username'],
                'displayName'  => $row['displayName'],
                'role'         => $row['role'],
                'permissions'  => json_decode($row['permissions'] ?: '{}', true) ?: [],
                'sessionId'    => $row['id'],
            ];
        } catch (\Throwable $e) {
            Config::logger()->error('[auth] verifySession failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Create audit log entry (shared table with Node.js).
     */
    public static function createAuditLog(array $data): void
    {
        try {
            Database::execute('
                INSERT INTO "AuditLog" (id, userId, action, resource, detail, ipAddress, userAgent, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))
            ', [
                $data['id'] ?? uuid(),
                $data['userId'] ?? null,
                $data['action'] ?? '',
                $data['resource'] ?? '',
                $data['detail'] ?? '',
                $data['ipAddress'] ?? '',
                $data['userAgent'] ?? '',
            ]);
        } catch (\Throwable $e) {
            Config::logger()->error('[auth] createAuditLog failed: ' . $e->getMessage());
        }
    }

    /**
     * Require authentication. Returns session or sends 401.
     */
    public static function requireAuth(): ?array
    {
        $token = $_COOKIE['session'] ?? null;
        if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
            if (str_starts_with($authHeader, 'Bearer ')) {
                $token = substr($authHeader, 7);
            }
        }
        return self::verifySession($token);
    }

    /**
     * Require specific role.
     */
    public static function requireRole(array $session, array $roles): bool
    {
        return in_array($session['role'], $roles, true);
    }

    /**
     * Check permission.
     */
    public static function hasPermission(array $session, string $perm): bool
    {
        if ($session['role'] === 'superadmin') {
            return true;
        }
        return !empty($session['permissions'][$perm]);
    }
}
