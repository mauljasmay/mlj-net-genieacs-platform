<?php
/**
 * MLJ NET PHP API - Main Router / Entry Point
 *
 * All PHP API requests are routed through this file via Caddy + PHP-FPM.
 * URL pattern: /api/php/{module}/{action}
 *
 * Authentication: Reads the same 'session' cookie as the Node.js backend.
 * The session token is verified against the shared SQLite database.
 */

declare(strict_types=1);

// Autoload
require_once __DIR__ . '/../vendor/autoload.php';

// Load library helpers (procedural functions)
require_once __DIR__ . '/../src/lib/helpers.php';

use MLJNet\Lib\{Config, Database, Auth};

// Initialize
Config::init();
Database::ensureTables();

// CORS headers (same-origin by default, but allow for development)
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Parse request path
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);

// Strip base path: /api/php/
$prefix = '/api/php/';
if (!str_starts_with($path, $prefix)) {
    jsonResponse(['error' => 'Not Found'], 404);
}

$relativePath = substr($path, strlen($prefix));
$parts = array_values(array_filter(explode('/', $relativePath)));
$module = $parts[0] ?? '';
$action = $parts[1] ?? '';
$param  = $parts[2] ?? null;

// Route to module handlers
$routes = [
    'system'   => \MLJNet\Api\System::class,
    'reports'  => \MLJNet\Api\Reports::class,
    'backup'   => \MLJNet\Api\Backup::class,
    'tools'    => \MLJNet\Api\Tools::class,
    'network'  => \MLJNet\Api\Network::class,
    'devices'  => \MLJNet\Api\Devices::class,
];

if (!isset($routes[$module])) {
    jsonResponse([
        'error'  => 'Endpoint not found',
        'available' => array_keys($routes),
    ], 404);
}

$handlerClass = $routes[$module];

// Map module + action to handler method
try {
    match ($module) {
        'system' => match ($action) {
            ''           => $handlerClass::health(),
            'info'       => $handlerClass::info(),
            default      => jsonResponse(['error' => 'Unknown action: system/' . $action], 404),
        },
        'reports' => match ($action) {
            'devices'    => $handlerClass::devices(),
            'audit'      => $handlerClass::audit(),
            'users'      => $handlerClass::users(),
            default      => jsonResponse(['error' => 'Unknown action: reports/' . $action], 404),
        },
        'backup' => match ($action) {
            ''           => match ($_SERVER['REQUEST_METHOD']) {
                'GET'    => $handlerClass::list(),
                'POST'   => $handlerClass::create(),
                default  => jsonResponse(['error' => 'Method not allowed'], 405),
            },
            'download'   => $handlerClass::download(),
            'restore'    => $handlerClass::restore(),
            default      => jsonResponse(['error' => 'Unknown action: backup/' . $action], 404),
        },
        'tools' => match ($action) {
            'ping'       => $handlerClass::ping(),
            'traceroute' => $handlerClass::traceroute(),
            'dns'        => $handlerClass::dns(),
            'portcheck'  => $handlerClass::portCheck(),
            default      => jsonResponse(['error' => 'Unknown action: tools/' . $action], 404),
        },
        'network' => match ($action) {
            'pppoe'      => $handlerClass::pppoe(),
            'hotspot'    => $handlerClass::hotspot(),
            'interfaces' => $handlerClass::interfaces(),
            'arp'        => $handlerClass::arp(),
            default      => jsonResponse(['error' => 'Unknown action: network/' . $action], 404),
        },
        'devices' => match ($action) {
            ''           => $handlerClass::list(),
            'tasks'      => match ($_SERVER['REQUEST_METHOD']) {
                'GET'    => $handlerClass::listTasks(),
                default  => jsonResponse(['error' => 'Method not allowed'], 405),
            },
            default      => $param !== null && $action !== 'tasks'
                ? match (true) {
                    $_SERVER['REQUEST_METHOD'] === 'GET' && !$param    => $handlerClass::detail($action),
                    $_SERVER['REQUEST_METHOD'] === 'DELETE' && !$param => $handlerClass::delete($action),
                    $_SERVER['REQUEST_METHOD'] === 'POST' && $param === 'task' => $handlerClass::createTask($action),
                    $_SERVER['REQUEST_METHOD'] === 'DELETE' && $param === 'tasks' => jsonResponse(['error' => 'Use /api/php/devices/tasks/:id'], 400),
                    default => jsonResponse(['error' => 'Unknown action: devices/' . $action], 404),
                }
                : jsonResponse(['error' => 'Unknown action: devices/' . $action], 404),
        },
        default => jsonResponse(['error' => 'Unknown module: ' . $module], 404),
    };
} catch (\Throwable $e) {
    $logger = Config::logger();
    $logger->error('[router] Unhandled exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString());

    jsonResponse([
        'error' => Config::isDebug() ? $e->getMessage() : 'Internal server error',
    ], 500);
}