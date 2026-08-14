<?php
// allocations.php — All allocation data stored in allocations_history only.
// User totals are computed dynamically via SUM() — no user_allocations table needed.
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    // Full allocation log
    $stmt = $pdo->query("SELECT * FROM allocations_history ORDER BY date DESC, created_at DESC");
    $history = $stmt->fetchAll();

    // Compute per-user totals dynamically from history
    $stmt2 = $pdo->query("SELECT userName, SUM(amount) as total FROM allocations_history GROUP BY userName");
    $userAllocations = [];
    foreach ($stmt2->fetchAll() as $row) {
        $userAllocations[$row['userName']] = floatval($row['total']);
    }

    echo json_encode([
        'success' => true,
        'allocationsHistory' => $history,
        'userAllocations' => $userAllocations
    ]);
    exit();
}

if ($method === 'POST') {
    $id       = $data['id'] ?? ('ALC-' . rand(1000, 9999));
    $userName = $data['userName'] ?? 'Raj';
    $type     = $data['type'] ?? 'User Transfer';
    $amount   = floatval($data['amount'] ?? 0);
    $date     = $data['date'] ?? date('Y-m-d');
    $notes    = $data['notes'] ?? '';

    $stmt = $pdo->prepare("INSERT INTO allocations_history (id, userName, type, amount, date, notes)
        VALUES (:id, :userName, :type, :amount, :date, :notes)");
    $stmt->execute([
        'id' => $id, 'userName' => $userName, 'type' => $type,
        'amount' => $amount, 'date' => $date, 'notes' => $notes
    ]);

    echo json_encode(['success' => true, 'id' => $id]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Allocation ID missing']);
        exit();
    }

    $stmtOld = $pdo->prepare("SELECT * FROM allocations_history WHERE id = :id");
    $stmtOld->execute(['id' => $id]);
    $oldAlloc = $stmtOld->fetch();

    if (!$oldAlloc) {
        echo json_encode(['success' => false, 'message' => 'Allocation not found']);
        exit();
    }

    $newUser   = $data['userName'] ?? $oldAlloc['userName'];
    $newAmount = isset($data['amount']) ? floatval($data['amount']) : floatval($oldAlloc['amount']);
    $newDate   = $data['date']  ?? $oldAlloc['date'];
    $newNotes  = $data['notes'] ?? $oldAlloc['notes'];

    $stmtUp = $pdo->prepare("UPDATE allocations_history SET userName = :userName, amount = :amount, date = :date, notes = :notes WHERE id = :id");
    $stmtUp->execute([
        'userName' => $newUser, 'amount' => $newAmount,
        'date' => $newDate, 'notes' => $newNotes, 'id' => $id
    ]);

    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Allocation ID missing']);
        exit();
    }

    $stmtDel = $pdo->prepare("DELETE FROM allocations_history WHERE id = :id");
    $stmtDel->execute(['id' => $id]);

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
