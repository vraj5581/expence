<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

// Ensure oldData column exists in audit_logs table
try {
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN oldData TEXT NULL");
} catch (\Exception $e) {
    // Column already exists
}

// Auto-delete entries older than the current month (when month changes)
$firstDayOfCurrentMonth = date('Y-m-01');
try {
    $stmtClean = $pdo->prepare("DELETE FROM audit_logs WHERE date < :current_month_start");
    $stmtClean->execute(['current_month_start' => $firstDayOfCurrentMonth]);
} catch (\Exception $e) {
    // Ignore error if table is empty or missing
}

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC");
    $logs = $stmt->fetchAll();
    echo json_encode(['success' => true, 'auditLogs' => $logs]);
    exit();
}

if ($method === 'POST') {
    $id = $data['id'] ?? ('EDT-' . time() . '-' . rand(1000, 9999));
    $editorName = $data['editorName'] ?? 'Admin';
    $txnId = $data['txnId'] ?? null;
    $txnType = $data['txnType'] ?? 'Entry';
    $entrySummary = $data['entrySummary'] ?? '';
    $changeDetails = $data['changeDetails'] ?? '';
    $date = $data['date'] ?? date('Y-m-d');
    $time = $data['time'] ?? date('h:i:s A');
    $oldData = isset($data['oldData']) ? (is_string($data['oldData']) ? $data['oldData'] : json_encode($data['oldData'])) : null;

    $stmt = $pdo->prepare("INSERT INTO audit_logs (id, editorName, txnId, txnType, entrySummary, changeDetails, date, time, oldData)
        VALUES (:id, :editorName, :txnId, :txnType, :entrySummary, :changeDetails, :date, :time, :oldData)");

    $stmt->execute([
        'id' => $id,
        'editorName' => $editorName,
        'txnId' => $txnId,
        'txnType' => $txnType,
        'entrySummary' => $entrySummary,
        'changeDetails' => $changeDetails,
        'date' => $date,
        'time' => $time,
        'oldData' => $oldData
    ]);

    $inserted = [
        'id' => $id,
        'editorName' => $editorName,
        'txnId' => $txnId,
        'txnType' => $txnType,
        'entrySummary' => $entrySummary,
        'changeDetails' => $changeDetails,
        'date' => $date,
        'time' => $time,
        'oldData' => $oldData
    ];

    echo json_encode(['success' => true, 'log' => $inserted]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? null;
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Missing audit log ID']);
        exit();
    }

    $editorName = $data['editorName'] ?? 'Admin';
    $entrySummary = $data['entrySummary'] ?? '';
    $changeDetails = $data['changeDetails'] ?? '';
    $date = $data['date'] ?? date('Y-m-d');
    $time = $data['time'] ?? date('h:i:s A');
    $txnType = $data['txnType'] ?? 'Entry';
    $oldData = isset($data['oldData']) ? (is_string($data['oldData']) ? $data['oldData'] : json_encode($data['oldData'])) : null;

    if ($oldData !== null) {
        $stmt = $pdo->prepare("UPDATE audit_logs SET editorName = :editorName, entrySummary = :entrySummary, changeDetails = :changeDetails, date = :date, time = :time, txnType = :txnType, oldData = :oldData WHERE id = :id");
        $stmt->execute([
            'id' => $id,
            'editorName' => $editorName,
            'entrySummary' => $entrySummary,
            'changeDetails' => $changeDetails,
            'date' => $date,
            'time' => $time,
            'txnType' => $txnType,
            'oldData' => $oldData
        ]);
    } else {
        $stmt = $pdo->prepare("UPDATE audit_logs SET editorName = :editorName, entrySummary = :entrySummary, changeDetails = :changeDetails, date = :date, time = :time, txnType = :txnType WHERE id = :id");
        $stmt->execute([
            'id' => $id,
            'editorName' => $editorName,
            'entrySummary' => $entrySummary,
            'changeDetails' => $changeDetails,
            'date' => $date,
            'time' => $time,
            'txnType' => $txnType
        ]);
    }

    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if ($id === 'last_month') {
        $stmt = $pdo->prepare("DELETE FROM audit_logs WHERE date < :current_month_start");
        $stmt->execute(['current_month_start' => $firstDayOfCurrentMonth]);
    } else if ($id && $id !== 'all') {
        $stmt = $pdo->prepare("DELETE FROM audit_logs WHERE id = :id");
        $stmt->execute(['id' => $id]);
    } else if ($id === 'all' || isset($_GET['clear_all'])) {
        $pdo->exec("TRUNCATE TABLE audit_logs");
    }

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
