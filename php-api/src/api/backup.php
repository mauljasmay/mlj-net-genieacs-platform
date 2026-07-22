<?php
/**
 * MLJ NET PHP API - Database Backup & Restore
 * GET  /api/php/backup            - List backups
 * POST /api/php/backup            - Create backup
 * GET  /api/php/backup/download   - Download latest backup
 * POST /api/php/backup/restore    - Restore from backup
 */

declare(strict_types=1);

namespace MLJNet\Api;

use MLJNet\Lib\{Config, Database, Auth, jsonResponse, uuid, getClientIp};

class Backup
{
    private static function getBackupDir(): string
    {
        $dir = dirname(__DIR__, 2) . '/backups';
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
        return $dir;
    }

    private static function getDbPath(): string
    {
        return Config::get('db_path');
    }

    /**
     * GET /api/php/backup - List database backups
     */
    public static function list(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        if (!Auth::requireRole($session, ['superadmin', 'admin'])) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }

        $backupDir = self::getBackupDir();
        $files = glob($backupDir . '/*.db.gz');
        $backups = [];

        foreach ($files as $file) {
            $name = basename($file);
            $size = filesize($file);
            $mtime = filemtime($file);

            // Parse backup name: custom_YYYYMMDD_HHMMSS.db.gz
            if (preg_match('/(\d{8})_(\d{6})/', $name, $m)) {
                $dateStr = $m[1] . $m[2];
                $date = \DateTime::createFromFormat('YmdHis', $dateStr);
            } else {
                $date = false;
            }

            $backups[] = [
                'filename' => $name,
                'size'     => $size,
                'size_hr'  => self::formatBytes($size),
                'date'     => $date ? $date->format('c') : date('c', $mtime),
                'created'  => $mtime,
            ];
        }

        // Sort by date descending
        usort($backups, fn($a, $b) => $b['created'] - $a['created']);

        jsonResponse([
            'total'   => count($backups),
            'backups' => $backups,
            'backup_dir' => $backupDir,
        ]);
    }

    /**
     * POST /api/php/backup - Create a backup
     */
    public static function create(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        if (!Auth::requireRole($session, ['superadmin', 'admin'])) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }

        $dbPath = self::getDbPath();
        if (!file_exists($dbPath)) {
            jsonResponse(['error' => 'Database file not found'], 404);
        }

        $backupDir = self::getBackupDir();
        $timestamp = date('Ymd_His');
        $backupFile = $backupDir . '/custom_' . $timestamp . '.db.gz';

        // Create backup using SQLite backup API (safe, even with concurrent access)
        $tempFile = $backupDir . '/custom_' . $timestamp . '.tmp.db';

        try {
            $srcDb = new \SQLite3($dbPath, SQLITE3_OPEN_READONLY);
            $dstDb = new \SQLite3($tempFile, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);

            $srcDb->backup($dstDb, SQLITE3_BACKUP_STEP, 1000);

            $srcDb->close();
            $dstDb->close();

            // Compress
            $fp = fopen($tempFile, 'rb');
            if (!$fp) {
                throw new \RuntimeException('Cannot open temp database for reading');
            }

            $gz = gzopen($backupFile, 'wb9');
            if (!$gz) {
                fclose($fp);
                throw new \RuntimeException('Cannot create gzip backup file');
            }

            while (!feof($fp)) {
                $data = fread($fp, 65536);
                if ($data === false) break;
                gzwrite($gz, $data);
            }

            gzclose($gz);
            fclose($fp);

            // Remove temp file
            @unlink($tempFile);

            // Keep only last 10 backups
            $allBackups = glob($backupDir . '/*.db.gz');
            usort($allBackups, fn($a, $b) => filemtime($b) - filemtime($a));
            if (count($allBackups) > 10) {
                foreach (array_slice($allBackups, 10) as $old) {
                    @unlink($old);
                }
            }

            Auth::createAuditLog([
                'userId'    => $session['id'],
                'action'    => 'backup_create',
                'resource'  => 'backup',
                'detail'    => 'Created database backup: ' . basename($backupFile),
                'ipAddress' => getClientIp(),
            ]);

            jsonResponse([
                'success'  => true,
                'filename' => basename($backupFile),
                'size'     => filesize($backupFile),
                'size_hr'  => self::formatBytes(filesize($backupFile)),
            ]);
        } catch (\Throwable $e) {
            @unlink($tempFile ?? '');
            jsonResponse(['error' => 'Backup failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/php/backup/download - Download latest backup
     */
    public static function download(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        if (!Auth::requireRole($session, ['superadmin', 'admin'])) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }

        $backupDir = self::getBackupDir();
        $files = glob($backupDir . '/*.db.gz');
        usort($files, fn($a, $b) => filemtime($b) - filemtime($a));

        if (empty($files)) {
            jsonResponse(['error' => 'No backups available'], 404);
        }

        $latestFile = $files[0];
        $filename = basename($latestFile);

        header('Content-Type: application/gzip');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($latestFile));
        header('Cache-Control: no-cache');

        readfile($latestFile);
        exit;
    }

    /**
     * POST /api/php/backup/restore - Restore from backup
     * Body: { "filename": "custom_20260101_120000.db.gz" }
     */
    public static function restore(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        if (!Auth::requireRole($session, ['superadmin', 'admin'])) {
            jsonResponse(['error' => 'Forbidden'], 403);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $filename = $input['filename'] ?? '';

        if (!$filename) {
            jsonResponse(['error' => 'Filename is required'], 400);
        }

        // Security: only allow .db.gz files
        if (!preg_match('/^[a-zA-Z0-9_]+\.db\.gz$/', $filename)) {
            jsonResponse(['error' => 'Invalid filename'], 400);
        }

        $backupDir = self::getBackupDir();
        $backupPath = $backupDir . '/' . $filename;

        if (!file_exists($backupPath)) {
            jsonResponse(['error' => 'Backup file not found: ' . $filename], 404);
        }

        $dbPath = self::getDbPath();

        try {
            // Create a pre-restore backup of current state
            $preRestoreFile = $backupDir . '/pre_restore_' . date('Ymd_His') . '.db.gz';
            if (file_exists($dbPath)) {
                $srcDb = new \SQLite3($dbPath, SQLITE3_OPEN_READONLY);
                $tempFile = $backupDir . '/pre_restore_' . date('Ymd_His') . '.tmp.db';
                $dstDb = new \SQLite3($tempFile, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
                $srcDb->backup($dstDb, SQLITE3_BACKUP_STEP, 1000);
                $srcDb->close();
                $dstDb->close();

                $fp = fopen($tempFile, 'rb');
                $gz = gzopen($preRestoreFile, 'wb9');
                while (!feof($fp)) {
                    $data = fread($fp, 65536);
                    if ($data === false) break;
                    gzwrite($gz, $data);
                }
                gzclose($gz);
                fclose($fp);
                @unlink($tempFile);
            }

            // Decompress backup to temp file
            $restoreTemp = $backupDir . '/restore_' . date('Ymd_His') . '.tmp.db';
            $gz = gzopen($backupPath, 'rb');
            if (!$gz) {
                throw new \RuntimeException('Cannot open backup file for reading');
            }
            $fp = fopen($restoreTemp, 'wb');
            if (!$fp) {
                gzclose($gz);
                throw new \RuntimeException('Cannot create temp restore file');
            }
            while (!gzeof($gz)) {
                $data = gzread($gz, 65536);
                if ($data === false) break;
                fwrite($fp, $data);
            }
            gzclose($gz);
            fclose($fp);

            // Verify restored database integrity
            $testDb = new \SQLite3($restoreTemp, SQLITE3_OPEN_READONLY);
            $integrity = $testDb->querySingle('PRAGMA integrity_check');
            $testDb->close();

            if ($integrity !== 'ok') {
                @unlink($restoreTemp);
                throw new \RuntimeException('Backup integrity check failed: ' . $integrity);
            }

            // Replace current database
            if (file_exists($dbPath)) {
                @chmod($dbPath, 0666);
            }
            copy($restoreTemp, $dbPath);
            @chmod($dbPath, 0666);
            @unlink($restoreTemp);

            Auth::createAuditLog([
                'userId'    => $session['id'],
                'action'    => 'backup_restore',
                'resource'  => 'backup',
                'detail'    => "Restored database from: {$filename} (pre-restore backup saved)",
                'ipAddress' => getClientIp(),
            ]);

            jsonResponse([
                'success'         => true,
                'restored_from'   => $filename,
                'pre_restore_backup' => basename($preRestoreFile),
            ]);
        } catch (\Throwable $e) {
            jsonResponse(['error' => 'Restore failed: ' . $e->getMessage()], 500);
        }
    }

    private static function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        return round($bytes, $precision) . ' ' . $units[$i];
    }
}
