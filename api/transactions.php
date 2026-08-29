<?php
// transactions.php - Routes to debit_transactions or credit_transactions based on type
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    // Single optimized UNION ALL query sorted natively in MySQL
    $sql = "SELECT id, date, userName, depositTo, amount, category, description, status, notes, createdBy, created_at, 'Cash Out' AS type FROM debit_transactions
            UNION ALL
            SELECT id, date, userName, depositTo, amount, category, description, status, notes, createdBy, created_at, 'Cash In' AS type FROM credit_transactions
            ORDER BY date DESC, created_at DESC";
    $all = $pdo->query($sql)->fetchAll();

    echo json_encode(['success' => true, 'transactions' => $all]);
    exit();
}

if ($method === 'POST') {
    $type = $data['type'] ?? 'Cash Out';
    $isCredit = in_array($type, ['Cash In', 'Credit']);

    if ($isCredit) {
        // Route to credit.php logic
        require __DIR__ . '/credit.php';
    } else {
        // Route to debit.php logic
        require __DIR__ . '/debit.php';
    }
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'Transaction ID missing']); exit(); }

    // Determine which table this ID belongs to
    $debitStmt = $pdo->prepare("SELECT id FROM debit_transactions WHERE id = :id");
    $debitStmt->execute(['id' => $id]);
    $isDebit = $debitStmt->fetch();

    $table = $isDebit ? 'debit_transactions' : 'credit_transactions';
    $allowed = ['date', 'userName', 'depositTo', 'amount', 'category', 'description', 'status', 'notes', 'createdBy'];

    $fields = [];
    $params = ['id' => $id];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data)) {
            $fields[] = "`$f` = :$f";
            $params[$f] = ($f === 'amount') ? floatval($data[$f]) : $data[$f];
        }
    }

    if (empty($fields)) { echo json_encode(['success' => false, 'message' => 'No fields to update']); exit(); }

    $stmt = $pdo->prepare("UPDATE $table SET " . implode(', ', $fields) . " WHERE id = :id");
    $stmt->execute($params);
    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($data['id'] ?? null);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'Transaction ID missing']); exit(); }

    // Try delete from both tables (one will match)
    $stmt1 = $pdo->prepare("DELETE FROM debit_transactions WHERE id = :id");
    $stmt1->execute(['id' => $id]);
    $stmt2 = $pdo->prepare("DELETE FROM credit_transactions WHERE id = :id");
    $stmt2->execute(['id' => $id]);
    try {
        $stmtAudit = $pdo->prepare("DELETE FROM audit_logs WHERE txnId = :id OR entrySummary LIKE CONCAT('%', :id, '%')");
        $stmtAudit->execute(['id' => $id]);
    } catch (\Exception $e) {}

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
