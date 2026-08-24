<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT *, 'Cash Out' as type FROM debit_transactions ORDER BY date DESC, created_at DESC");
    $rows = $stmt->fetchAll();
    echo json_encode(['success' => true, 'debits' => $rows]);
    exit();
}

if ($method === 'POST') {
    $id          = $data['id'] ?? ('DBT-' . rand(1000, 9999));
    $date        = $data['date'] ?? date('Y-m-d');
    $userName    = $data['userName'] ?? 'Vraj';
    $amount      = floatval($data['amount'] ?? 0);
    $category    = $data['category'] ?? 'General';
    $description = $data['description'] ?? '';
    $status      = $data['status'] ?? 'Done';
    $notes       = $data['notes'] ?? '';
    $createdBy   = $data['createdBy'] ?? 'Admin';

    $stmt = $pdo->prepare("INSERT INTO debit_transactions (id, date, userName, amount, category, description, status, notes, createdBy)
        VALUES (:id, :date, :userName, :amount, :category, :description, :status, :notes, :createdBy)");
    $stmt->execute([
        'id' => $id, 'date' => $date, 'userName' => $userName,
        'amount' => $amount, 'category' => $category, 'description' => $description,
        'status' => $status, 'notes' => $notes, 'createdBy' => $createdBy
    ]);

    echo json_encode(['success' => true, 'debit' => array_merge(compact('id','date','userName','amount','category','description','status','notes','createdBy'), ['type' => 'Cash Out'])]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID missing']); exit(); }

    $fields = [];
    $params = ['id' => $id];
    $allowed = ['date', 'userName', 'amount', 'category', 'description', 'status', 'notes', 'createdBy'];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data)) {
            $fields[] = "`$f` = :$f";
            $params[$f] = ($f === 'amount') ? floatval($data[$f]) : $data[$f];
        }
    }
    if (empty($fields)) { echo json_encode(['success' => false, 'message' => 'No fields to update']); exit(); }

    $stmt = $pdo->prepare("UPDATE debit_transactions SET " . implode(', ', $fields) . " WHERE id = :id");
    $stmt->execute($params);
    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($data['id'] ?? null);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID missing']); exit(); }
    $stmt = $pdo->prepare("DELETE FROM debit_transactions WHERE id = :id");
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
