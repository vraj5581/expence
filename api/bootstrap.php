<?php
// bootstrap.php — Single-request bulk fetch for high-speed ERP synchronization
require_once __DIR__ . '/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // 1. Debit Transactions
    $stmt1 = $pdo->query("SELECT *, 'Cash Out' as type FROM debit_transactions ORDER BY date DESC, created_at DESC");
    $debits = $stmt1->fetchAll();

    // 2. Credit Transactions
    $stmt2 = $pdo->query("SELECT *, 'Cash In' as type FROM credit_transactions ORDER BY date DESC, created_at DESC");
    $credits = $stmt2->fetchAll();

    // 3. Vault Deposits
    $stmt3 = $pdo->query("SELECT * FROM vault_deposits ORDER BY date DESC, created_at DESC");
    $vaultDeposits = $stmt3->fetchAll();

    // 4. Allocations History & User Totals
    $stmt4 = $pdo->query("SELECT * FROM allocations_history ORDER BY date DESC, created_at DESC");
    $allocationsHistory = $stmt4->fetchAll();

    $stmt4b = $pdo->query("SELECT userName, SUM(amount) as total FROM allocations_history GROUP BY userName");
    $userAllocations = [];
    foreach ($stmt4b->fetchAll() as $row) {
        $userAllocations[$row['userName']] = floatval($row['total']);
    }

    // 5. Users
    $stmt5 = $pdo->query("SELECT id, name, username, role, status, avatar, created_at, created_at as createdAt FROM users ORDER BY created_at DESC");
    $users = $stmt5->fetchAll();

    // 6. Settings
    $stmt6 = $pdo->query("SELECT * FROM settings WHERE id = 1");
    $settingsRow = $stmt6->fetch();
    $settings = $settingsRow ?: null;

    // 7. Tasks
    $stmt7 = $pdo->query("SELECT *, created_at as createdAt FROM tasks ORDER BY created_at DESC");
    $tasks = $stmt7->fetchAll();

    // 8. Audit Logs
    $stmt8 = $pdo->query("SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC");
    $auditLogs = $stmt8->fetchAll();

    echo json_encode([
        'success' => true,
        'debits' => $debits,
        'credits' => $credits,
        'vaultDeposits' => $vaultDeposits,
        'allocationsHistory' => $allocationsHistory,
        'userAllocations' => $userAllocations,
        'users' => $users,
        'settings' => $settings,
        'tasks' => $tasks,
        'auditLogs' => $auditLogs
    ]);
} catch (\Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Bootstrap Fetch Error: ' . $e->getMessage()
    ]);
}
?>
