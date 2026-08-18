<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

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

    $stmt = $pdo->prepare("INSERT INTO audit_logs (id, editorName, txnId, txnType, entrySummary, changeDetails, date, time)
        VALUES (:id, :editorName, :txnId, :txnType, :entrySummary, :changeDetails, :date, :time)");

    $stmt->execute([
        'id' => $id,
        'editorName' => $editorName,
        'txnId' => $txnId,
        'txnType' => $txnType,
        'entrySummary' => $entrySummary,
        'changeDetails' => $changeDetails,
        'date' => $date,
        'time' => $time
    ]);

    $inserted = [
        'id' => $id,
        'editorName' => $editorName,
        'txnId' => $txnId,
        'txnType' => $txnType,
        'entrySummary' => $entrySummary,
        'changeDetails' => $changeDetails,
        'date' => $date,
        'time' => $time
    ];

    echo json_encode(['success' => true, 'log' => $inserted]);
    exit();
}

if ($method === 'DELETE') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if ($id && $id !== 'all') {
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
