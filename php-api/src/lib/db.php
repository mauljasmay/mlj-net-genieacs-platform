<?php
/**
 * MLJ NET PHP API - Database Layer
 * Direct SQLite3 access to the same database used by Node.js/Prisma.
 * Auto-creates tables if missing (mirrors Prisma schema).
 */

declare(strict_types=1);

namespace MLJNet\Lib;

class Database
{
    private static ?\SQLite3 $instance = null;
    private static bool $tablesEnsured = false;

    public static function getInstance(): \SQLite3
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        Config::init();
        $dbPath = Config::get('db_path');

        // Ensure directory exists
        $dbDir = dirname($dbPath);
        if (!is_dir($dbDir)) {
            @mkdir($dbDir, 0755, true);
        }

        // Fix permissions if read-only
        if (file_exists($dbPath) && !is_writable($dbPath)) {
            @chmod($dbPath, 0666);
        }

        // Remove stale WAL/SHM
        foreach (['-wal', '-shm'] as $ext) {
            $walFile = $dbPath . $ext;
            if (file_exists($walFile)) {
                @unlink($walFile);
            }
        }

        self::$instance = new \SQLite3($dbPath, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
        self::$instance->busyTimeout(5000);
        self::$instance->exec('PRAGMA journal_mode=WAL');
        self::$instance->exec('PRAGMA foreign_keys=ON');

        self::ensureTables();

        return self::$instance;
    }

    public static function ensureTables(): void
    {
        if (self::$tablesEnsured) {
            return;
        }

        $db = self::getInstance();

        // Check if User table exists
        $result = $db->querySingle("SELECT name FROM sqlite_master WHERE type='table' AND name='User'");
        if ($result) {
            self::$tablesEnsured = true;
            return;
        }

        Config::logger()->info('[db] Tables missing, creating schema via raw SQL...');

        $db->exec('BEGIN TRANSACTION');

        $db->exec('
            CREATE TABLE IF NOT EXISTS "User" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "username" TEXT NOT NULL,
                "passwordHash" TEXT NOT NULL,
                "displayName" TEXT,
                "role" TEXT NOT NULL DEFAULT \'viewer\',
                "permissions" TEXT NOT NULL DEFAULT \'{}\',
                "isActive" BOOLEAN NOT NULL DEFAULT 1,
                "lastLoginAt" DATETIME,
                "lastLoginIp" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
        ');

        $db->exec('
            CREATE TABLE IF NOT EXISTS "Session" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "userAgent" TEXT,
                "ipAddress" TEXT,
                "expiresAt" DATETIME NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
        ');

        $db->exec('
            CREATE TABLE IF NOT EXISTS "AuditLog" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "userId" TEXT,
                "action" TEXT NOT NULL,
                "resource" TEXT,
                "detail" TEXT,
                "ipAddress" TEXT,
                "userAgent" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            );
        ');

        $db->exec('
            CREATE TABLE IF NOT EXISTS "SystemSetting" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "key" TEXT NOT NULL,
                "value" TEXT NOT NULL,
                "type" TEXT NOT NULL DEFAULT \'string\',
                "category" TEXT NOT NULL DEFAULT \'general\',
                "updatedAt" DATETIME NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");
        ');

        $db->exec('
            CREATE TABLE IF NOT EXISTS "LoginAttempt" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "username" TEXT NOT NULL,
                "ipAddress" TEXT NOT NULL,
                "success" BOOLEAN NOT NULL DEFAULT 0,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        ');

        $db->exec('COMMIT');
        self::$tablesEnsured = true;
        Config::logger()->info('[db] Schema created successfully via PHP');
    }

    // --- Helper query methods ---

    public static function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = self::getInstance()->prepare($sql);
        if (!$stmt) return null;
        $i = 1;
        foreach ($params as $val) {
            $stmt->bindValue($i, $val);
            $i++;
        }
        $result = $stmt->execute();
        if (!$result) return null;
        $row = $result->fetchArray(SQLITE3_ASSOC);
        $result->finalize();
        return $row ?: null;
    }

    public static function fetchAll(string $sql, array $params = []): array
    {
        $stmt = self::getInstance()->prepare($sql);
        if (!$stmt) return [];
        $i = 1;
        foreach ($params as $val) {
            $stmt->bindValue($i, $val);
            $i++;
        }
        $result = $stmt->execute();
        if (!$result) return [];
        $rows = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = $row;
        }
        $result->finalize();
        return $rows;
    }

    public static function execute(string $sql, array $params = []): bool
    {
        $stmt = self::getInstance()->prepare($sql);
        if (!$stmt) return false;
        $i = 1;
        foreach ($params as $val) {
            $stmt->bindValue($i, $val);
            $i++;
        }
        return $stmt->execute() !== false;
    }

    public static function lastInsertId(): string
    {
        return self::getInstance()->lastInsertRowID();
    }

    public static function getSetting(string $key, string $default = ''): string
    {
        $row = self::fetchOne('SELECT value FROM "SystemSetting" WHERE "key" = ?', [$key]);
        return $row['value'] ?? $default;
    }

    public static function getSettingsByCategory(string $category): array
    {
        return self::fetchAll('SELECT "key", value, type FROM "SystemSetting" WHERE category = ?', [$category]);
    }
}
