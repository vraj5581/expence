<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM allocations_history ORDER BY date DESC, created_at DESC");
    $history = $stmt->fetchAll();

    $stmt2 = $pdo->query("SELECT * FROM user_allocations");
    $allocRows = $stmt2->fetchAll();

    $userAllocations = [];
    foreach ($allocRows as $row) {
        $userAllocations[$row['userName']] = floatval($row['allocated']);
    }

    echo json_encode([
        'success' => true,
        'allocationsHistory' => $history,
        'userAllocations' => $userAllocations
    ]);
    exit();
}

if ($method === 'POST') {
    $id = $data['id'] ?? ('ALC-' . rand(1000, 9999));
    $userName = $data['userName'] ?? 'Raj';
    $type = $data['type'] ?? 'User Transfer';
    $amount = floatval($data['amount'] ?? 0);
    $date = $data['date'] ?? date('Y-m-d');
    $notes = $data['notes'] ?? '';

    // Insert into history
    $stmt = $pdo->prepare("INSERT INTO allocations_history (id, userName, type, amount, date, notes)
        VALUES (:id, :userName, :type, :amount, :date, :notes)");
    $stmt->execute([
        'id' => $id, 'userName' => $userName, 'type' => $type,
        'amount' => $amount, 'date' => $date, 'notes' => $notes
    ]);

    // Update cumulative user allocation
    $stmt2 = $pdo->prepare("INSERT INTO user_allocations (userName, allocated) VALUES (:userName, :amount)
        ON DUPLICATE KEY UPDATE allocated = allocated + :amount");
    $stmt2->execute(['userName' => $userName, 'amount' => $amount]);

    echo json_encode(['success' => true, 'id' => $id]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Allocation ID missing']);
        exit();
    }

    // Get old allocation
    $stmtOld = $pdo->prepare("SELECT * FROM allocations_history WHERE id = :id");
    $stmtOld->execute(['id' => $id]);
    $oldAlloc = $stmtOld->fetch();

    if ($oldAlloc) {
        $oldUser = $oldAlloc['userName'];
        $oldAmount = floatval($oldAlloc['amount']);

        $newUser = $data['userName'] ?? $oldUser;
        $newAmount = isset($data['amount']) ? floatval($data['amount']) : $oldAmount;
        $newDate = $data['date'] ?? $oldAlloc['date'];
        $newNotes = $data['notes'] ?? $oldAlloc['notes'];

        // Update history
        $stmtUp = $pdo->prepare("UPDATE allocations_history SET userName = :userName, amount = :amount, date = :date, notes = :notes WHERE id = :id");
        $stmtUp->execute([
            'userName' => $newUser, 'amount' => $newAmount,
            'date' => $newDate, 'notes' => $newNotes, 'id' => $id
        ]);

        // Recalculate user_allocations table
        if ($oldUser === $newUser) {
            $diff = $newAmount - $oldAmount;
            $stmtAlloc = $pdo->prepare("UPDATE user_allocations SET allocated = GREATEST(0, allocated + :diff) WHERE userName = :userName");
            $stmtAlloc->execute(['diff' => $diff, 'userName' => $newUser]);
        } else {
            $stmtSub = $pdo->prepare("UPDATE user_allocations SET allocated = GREATEST(0, allocated - :oldAmount) WHERE userName = :oldUser");
            $stmtSub->execute(['oldAmount' => $oldAmount, 'oldUser' => $oldUser]);

            $stmtAdd = $pdo->prepare("INSERT INTO user_allocations (userName, allocated) VALUES (:newUser, :newAmount)
                ON DUPLICATE KEY UPDATE allocated = allocated + :newAmount");
            $stmtAdd->execute(['newUser' => $newUser, 'newAmount' => $newAmount]);
        }
    }

    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Allocation ID missing']);
        exit();
    }

    $stmtOld = $pdo->prepare("SELECT * FROM allocations_history WHERE id = :id");
    $stmtOld->execute(['id' => $id]);
    $oldAlloc = $stmtOld->fetch();

    if ($oldAlloc) {
        $userName = $oldAlloc['userName'];
        $amount = floatval($oldAlloc['amount']);

        $stmtSub = $pdo->prepare("UPDATE user_allocations SET allocated = GREATEST(0, allocated - :amount) WHERE userName = :userName");
        $stmtSub->execute(['amount' => $amount, 'userName' => $userName]);

        $stmtDel = $pdo->prepare("DELETE FROM allocations_history WHERE id = :id");
        $stmtDel->execute(['id' => $id]);
    }

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
