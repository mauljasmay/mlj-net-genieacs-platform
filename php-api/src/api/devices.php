<?php
/**
 * MLJ NET PHP API - Device Management (mirror of Node.js devices route)
 * GET    /api/php/devices          - List all devices
 * GET    /api/php/devices/:id      - Get device details
 * DELETE /api/php/devices/:id      - Delete device
 * POST   /api/php/devices/:id/task - Create task for device
 * GET    /api/php/devices/tasks    - List all tasks
 * DELETE /api/php/devices/tasks/:id - Delete task
 */

declare(strict_types=1);

namespace MLJNet\Api;

use MLJNet\Lib\{Config, Database, Auth, GenieACS, jsonResponse, uuid, getClientIp, getClientUserAgent};

class Devices
{
    /**
     * GET /api/php/devices - List all devices from GenieACS
     */
    public static function list(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $result = GenieACS::getDevices();
        $devices = $result['data'] ?? [];

        $list = [];
        foreach ($devices as $d) {
            $deviceId = $d['_id'] ?? '';
            $lastInform = $d['_lastInform'] ?? null;
            $isOnline = $lastInform && (strtotime($lastInform) > time() - 600);

            $list[] = [
                'id'           => $deviceId,
                'serial'       => $d['_deviceId']['_SerialNumber'] ?? '',
                'manufacturer' => $d['_deviceId']['_Manufacturer'] ?? '',
                'model'        => $d['_deviceId']['_ProductClass'] ?? '',
                'oui'          => $d['_deviceId']['_OUI'] ?? '',
                'last_inform'  => $lastInform,
                'is_online'    => $isOnline,
                'tags'         => $d['_tags'] ?? [],
            ];
        }

        jsonResponse([
            'total'   => count($list),
            'devices' => $list,
        ]);
    }

    /**
     * GET /api/php/devices/:id - Get device details with parameters
     */
    public static function detail(string $deviceId): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $device = GenieACS::getDevice($deviceId);
        $params = GenieACS::getDeviceParameters($deviceId);

        jsonResponse([
            'device'     => $device['data'] ?? [],
            'parameters' => $params['data'] ?? [],
        ]);
    }

    /**
     * DELETE /api/php/devices/:id - Delete device from GenieACS
     */
    public static function delete(string $deviceId): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $result = GenieACS::deleteDevice($deviceId);

        Auth::createAuditLog([
            'userId'    => $session['id'],
            'action'    => 'delete_device',
            'resource'  => 'devices',
            'detail'    => "Deleted device {$deviceId} via PHP",
            'ipAddress' => getClientIp(),
        ]);

        jsonResponse(['success' => true, 'status' => $result['status'] ?? 0]);
    }

    /**
     * POST /api/php/devices/:id/task - Create a task
     */
    public static function createTask(string $deviceId): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $taskName = $input['taskName'] ?? $input['name'] ?? '';
        $taskParams = $input['params'] ?? [];

        if (!$taskName) {
            jsonResponse(['error' => 'Task name is required'], 400);
        }

        $result = GenieACS::createTask($deviceId, $taskName, $taskParams);

        Auth::createAuditLog([
            'userId'    => $session['id'],
            'action'    => 'create_task',
            'resource'  => 'devices',
            'detail'    => "Task '{$taskName}' on device {$deviceId} via PHP",
            'ipAddress' => getClientIp(),
        ]);

        jsonResponse(['success' => true, 'task' => $result['data'] ?? []]);
    }

    /**
     * GET /api/php/devices/tasks - List all tasks
     */
    public static function listTasks(): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $result = GenieACS::getTasks();
        jsonResponse(['tasks' => $result['data'] ?? []]);
    }

    /**
     * DELETE /api/php/devices/tasks/:id - Delete a task
     */
    public static function deleteTask(string $taskId): void
    {
        $session = Auth::requireAuth();
        if (!$session) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $result = GenieACS::deleteTask($taskId);
        jsonResponse(['success' => true]);
    }
}