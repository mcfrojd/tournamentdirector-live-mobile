<?php
// td-receiver.php
// Place this file in the same folder as td-status-receiver.html on your Nginx server.
// In Tournament Director, set the URL to: http://192.168.50.99/td-receiver.php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile  = __DIR__ . '/td-latest.json';
$debugFile = __DIR__ . '/td-debug.log';
$rawFile   = __DIR__ . '/td-raw.txt';

// ── POST: receive data from Tournament Director ───────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw         = file_get_contents('php://input');
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    // Debug log every incoming POST
    $logLine = date('c')
        . " | CT=" . $contentType
        . " | BODY=" . substr($raw ?: json_encode($_POST), 0, 800)
        . "\n";
    file_put_contents($debugFile, $logLine, FILE_APPEND);

    $data = null;

    // 1. Try raw JSON body
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if ($decoded !== null) {
            $data = $decoded;
        } else {
            // 2. Try form-encoded in raw body
            parse_str($raw, $formData);
            if (!empty($formData)) {
                $data = $formData;
            } else {
                file_put_contents($rawFile, $raw);
            }
        }
    }

    // 3. Fall back to $_POST
    if ($data === null && !empty($_POST)) {
        $data = $_POST;
    }

    if ($data !== null) {
        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
        echo json_encode(['status' => 'ok', 'saved' => date('c'), 'fields' => array_keys($data)]);
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Could not parse body. Check td-debug.log']);
    }
    exit;
}

// ── GET: return latest saved data to the HTML dashboard ──────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // ?debug=1 shows last 30 log lines
    if (isset($_GET['debug'])) {
        header('Content-Type: text/plain');
        echo file_exists($debugFile) ? implode('', array_slice(file($debugFile), -30)) : 'No debug log yet.';
        exit;
    }
    // ?raw=1 shows pretty JSON
    if (isset($_GET['raw'])) {
        header('Content-Type: text/plain');
        echo file_exists($dataFile) ? file_get_contents($dataFile) : 'No data yet.';
        exit;
    }

    echo file_exists($dataFile) ? file_get_contents($dataFile) : json_encode([]);
    exit;
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
