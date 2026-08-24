<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT *, 'Cash In' as type FROM credit_transactions ORDER BY date DESC, created_at DESC");
    $rows = $stmt->fetchAll();
    echo json_encode(['success' => true, 'credits' => $rows]);
    exit();
}

if ($method === 'POST') {
    $id          = $data['id'] ?? ('CRD-' . rand(1000, 9999));
    $date        = $data['date'] ?? date('Y-m-d');
    $userName    = $data['userName'] ?? 'Vraj';
    $depositTo   = $data['depositTo'] ?? 'My Hand';
    $amount      = floatval($data['amount'] ?? 0);
    $category    = $data['category'] ?? 'General';
    $description = $data['description'] ?? '';
    $status      = $data['status'] ?? 'Done';
    $notes       = $data['notes'] ?? '';
    $createdBy   = $data['createdBy'] ?? 'Admin';

    $stmt = $pdo->prepare("INSERT INTO credit_transactions (id, date, userName, depositTo, amount, category, description, status, notes, createdBy)
        VALUES (:id, :date, :userName, :depositTo, :amount, :category, :description, :status, :notes, :createdBy)");
    $stmt->execute([
        'id' => $id, 'date' => $date, 'userName' => $userName, 'depositTo' => $depositTo,
        'amount' => $amount, 'category' => $category, 'description' => $description,
        'status' => $status, 'notes' => $notes, 'createdBy' => $createdBy
    ]);

    echo json_encode(['success' => true, 'credit' => array_merge(compact('id','date','userName','depositTo','amount','category','description','status','notes','createdBy'), ['type' => 'Cash In'])]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID missing']); exit(); }

    $fields = [];
    $params = ['id' => $id];
    $allowed = ['date', 'userName', 'depositTo', 'amount', 'category', 'description', 'status', 'notes', 'createdBy'];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data)) {
            $fields[] = "`$f` = :$f";
            $params[$f] = ($f === 'amount') ? floatval($data[$f]) : $data[$f];
        }
    }
    if (empty($fields)) { echo json_encode(['success' => false, 'message' => 'No fields to update']); exit(); }

    $stmt = $pdo->prepare("UPDATE credit_transactions SET " . implode(', ', $fields) . " WHERE id = :id");
    $stmt->execute($params);
    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($data['id'] ?? null);
    if (!$id) { echo json_encode(['success' => false, 'message' => 'ID missing']); exit(); }
    $stmt = $pdo->prepare("DELETE FROM credit_transactions WHERE id = :id");
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
