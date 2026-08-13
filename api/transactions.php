<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM transactions ORDER BY date DESC, created_at DESC");
    $transactions = $stmt->fetchAll();
    echo json_encode(['success' => true, 'transactions' => $transactions]);
    exit();
}

if ($method === 'POST') {
    $id = $data['id'] ?? ('TXN-' . rand(1000, 9999));
    $date = $data['date'] ?? date('Y-m-d');
    $type = $data['type'] ?? 'Cash Out';
    $userName = $data['userName'] ?? 'Vraj';
    $depositTo = $data['depositTo'] ?? 'My Hand';
    $amount = floatval($data['amount'] ?? 0);
    $category = $data['category'] ?? 'General';
    $description = $data['description'] ?? '';
    $status = $data['status'] ?? 'Done';
    $notes = $data['notes'] ?? '';
    $createdBy = $data['createdBy'] ?? 'Admin';
    $isAllocation = isset($data['isAllocation']) ? ($data['isAllocation'] ? 1 : 0) : 0;

    $stmt = $pdo->prepare("INSERT INTO transactions (id, date, type, userName, depositTo, amount, category, description, status, notes, createdBy, isAllocation)
        VALUES (:id, :date, :type, :userName, :depositTo, :amount, :category, :description, :status, :notes, :createdBy, :isAllocation)");
    
    $stmt->execute([
        'id' => $id,
        'date' => $date,
        'type' => $type,
        'userName' => $userName,
        'depositTo' => $depositTo,
        'amount' => $amount,
        'category' => $category,
        'description' => $description,
        'status' => $status,
        'notes' => $notes,
        'createdBy' => $createdBy,
        'isAllocation' => $isAllocation
    ]);

    $inserted = [
        'id' => $id, 'date' => $date, 'type' => $type, 'userName' => $userName,
        'depositTo' => $depositTo, 'amount' => $amount, 'category' => $category,
        'description' => $description, 'status' => $status, 'notes' => $notes,
        'createdBy' => $createdBy, 'isAllocation' => $isAllocation
    ];

    echo json_encode(['success' => true, 'transaction' => $inserted]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Transaction ID missing']);
        exit();
    }

    $fields = [];
    $params = ['id' => $id];

    $allowed = ['date', 'type', 'userName', 'depositTo', 'amount', 'category', 'description', 'status', 'notes', 'createdBy', 'isAllocation'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "`$field` = :$field";
            $params[$field] = ($field === 'amount') ? floatval($data[$field]) : $data[$field];
        }
    }

    if (empty($fields)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        exit();
    }

    $sql = "UPDATE transactions SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Transaction ID missing']);
        exit();
    }

    $stmt = $pdo->prepare("DELETE FROM transactions WHERE id = :id");
    $stmt->execute(['id' => $id]);

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
