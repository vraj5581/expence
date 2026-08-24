<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM vault_deposits ORDER BY date DESC, created_at DESC");
    $deposits = $stmt->fetchAll();
    echo json_encode(['success' => true, 'vaultDeposits' => $deposits]);
    exit();
}

if ($method === 'POST') {
    $id = $data['id'] ?? ('DEP-' . rand(1000, 9999));
    $date = $data['date'] ?? date('Y-m-d');
    $userName = $data['userName'] ?? 'Vraj';
    $amount = floatval($data['amount'] ?? 0);
    $notes = $data['notes'] ?? '';
    $txnId = $data['txnId'] ?? null;
    $status = $data['status'] ?? 'Done';

    $stmt = $pdo->prepare("INSERT INTO vault_deposits (id, date, userName, amount, notes, txnId, status)
        VALUES (:id, :date, :userName, :amount, :notes, :txnId, :status)");

    $stmt->execute([
        'id' => $id,
        'date' => $date,
        'userName' => $userName,
        'amount' => $amount,
        'notes' => $notes,
        'txnId' => $txnId,
        'status' => $status
    ]);

    $inserted = [
        'id' => $id, 'date' => $date, 'userName' => $userName,
        'amount' => $amount, 'notes' => $notes, 'txnId' => $txnId, 'status' => $status
    ];

    echo json_encode(['success' => true, 'deposit' => $inserted]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Deposit ID missing']);
        exit();
    }

    $fields = [];
    $params = ['id' => $id];

    $allowed = ['date', 'userName', 'amount', 'notes', 'txnId', 'status'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "`$field` = :$field";
            $params[$field] = ($field === 'amount') ? floatval($data[$field]) : $data[$field];
        }
    }

    if (!empty($fields)) {
        $sql = "UPDATE vault_deposits SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($data['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Deposit ID missing']);
        exit();
    }

    $stmt = $pdo->prepare("DELETE FROM vault_deposits WHERE id = :id");
    $stmt->execute(['id' => $id]);
    try {
        $stmtAudit = $pdo->prepare("DELETE FROM audit_logs WHERE txnId = :id OR entrySummary LIKE CONCAT('%', :id, '%')");
        $stmtAudit->execute(['id' => $id]);
    } catch (\Exception $e) {}

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
