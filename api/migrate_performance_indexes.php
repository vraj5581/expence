<?php
// migrate_performance_indexes.php — Non-destructive index optimizer for Shukan Expense ERP
require_once __DIR__ . '/db.php';

echo "=== Shukan Expense ERP Database Index Optimization ===\n\n";

$indexes = [
    // 1. Debit Transactions (Cash Out)
    [
        'table' => 'debit_transactions',
        'name'  => 'idx_debit_date_created',
        'cols'  => '`date` DESC, `created_at` DESC'
    ],
    [
        'table' => 'debit_transactions',
        'name'  => 'idx_debit_user',
        'cols'  => '`userName`'
    ],
    [
        'table' => 'debit_transactions',
        'name'  => 'idx_debit_deposit',
        'cols'  => '`depositTo`'
    ],
    [
        'table' => 'debit_transactions',
        'name'  => 'idx_debit_status',
        'cols'  => '`status`'
    ],
    [
        'table' => 'debit_transactions',
        'name'  => 'idx_debit_category',
        'cols'  => '`category`'
    ],

    // 2. Credit Transactions (Cash In)
    [
        'table' => 'credit_transactions',
        'name'  => 'idx_credit_date_created',
        'cols'  => '`date` DESC, `created_at` DESC'
    ],
    [
        'table' => 'credit_transactions',
        'name'  => 'idx_credit_user',
        'cols'  => '`userName`'
    ],
    [
        'table' => 'credit_transactions',
        'name'  => 'idx_credit_deposit',
        'cols'  => '`depositTo`'
    ],
    [
        'table' => 'credit_transactions',
        'name'  => 'idx_credit_status',
        'cols'  => '`status`'
    ],

    // 3. Vault Deposits
    [
        'table' => 'vault_deposits',
        'name'  => 'idx_vault_date_created',
        'cols'  => '`date` DESC, `created_at` DESC'
    ],
    [
        'table' => 'vault_deposits',
        'name'  => 'idx_vault_txnid',
        'cols'  => '`txnId`'
    ],
    [
        'table' => 'vault_deposits',
        'name'  => 'idx_vault_user',
        'cols'  => '`userName`'
    ],
    [
        'table' => 'vault_deposits',
        'name'  => 'idx_vault_status',
        'cols'  => '`status`'
    ],

    // 4. Allocations History
    [
        'table' => 'allocations_history',
        'name'  => 'idx_alloc_date_created',
        'cols'  => '`date` DESC, `created_at` DESC'
    ],
    [
        'table' => 'allocations_history',
        'name'  => 'idx_alloc_user',
        'cols'  => '`userName`'
    ],

    // 5. Tasks
    [
        'table' => 'tasks',
        'name'  => 'idx_tasks_created',
        'cols'  => '`created_at` DESC'
    ],
    [
        'table' => 'tasks',
        'name'  => 'idx_tasks_status',
        'cols'  => '`status`'
    ],
    [
        'table' => 'tasks',
        'name'  => 'idx_tasks_assigned',
        'cols'  => '`assignedTo`'
    ],
    [
        'table' => 'tasks',
        'name'  => 'idx_tasks_due',
        'cols'  => '`dueDate`'
    ],

    // 6. Audit Logs
    [
        'table' => 'audit_logs',
        'name'  => 'idx_audit_created_id',
        'cols'  => '`created_at` DESC, `id` DESC'
    ],
    [
        'table' => 'audit_logs',
        'name'  => 'idx_audit_txnid',
        'cols'  => '`txnId`'
    ],
    [
        'table' => 'audit_logs',
        'name'  => 'idx_audit_date',
        'cols'  => '`date`'
    ],

    // 7. Box Calculations
    [
        'table' => 'box_calculations',
        'name'  => 'idx_box_created',
        'cols'  => '`created_at` DESC'
    ],

    // 8. Users
    [
        'table' => 'users',
        'name'  => 'idx_users_name',
        'cols'  => '`name`'
    ]
];

// Helper to check if index already exists
function indexExists($pdo, $table, $indexName) {
    try {
        $stmt = $pdo->prepare("SHOW INDEX FROM `$table` WHERE Key_name = :idx");
        $stmt->execute(['idx' => $indexName]);
        return (bool) $stmt->fetch();
    } catch (\Exception $e) {
        return false;
    }
}

// Ensure oldData column exists in audit_logs once and for all
try {
    $cols = $pdo->query("SHOW COLUMNS FROM audit_logs LIKE 'oldData'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN oldData TEXT NULL");
        echo "✓ Added 'oldData' column to audit_logs table\n";
    }
} catch (\Exception $e) {
    echo "! Notice on audit_logs oldData column: " . $e->getMessage() . "\n";
}

$createdCount = 0;
$existingCount = 0;

foreach ($indexes as $idx) {
    $table = $idx['table'];
    $name  = $idx['name'];
    $cols  = $idx['cols'];

    // Verify table exists
    try {
        $check = $pdo->query("SHOW TABLES LIKE '$table'")->fetch();
        if (!$check) {
            echo "⊘ Skipped: Table `$table` does not exist yet\n";
            continue;
        }
    } catch (\Exception $e) {
        continue;
    }

    if (indexExists($pdo, $table, $name)) {
        echo "✓ Already exists: `$table`.`$name`\n";
        $existingCount++;
    } else {
        try {
            $sql = "CREATE INDEX `$name` ON `$table` ($cols)";
            $pdo->exec($sql);
            echo "★ Created index: `$table`.`$name` on ($cols)\n";
            $createdCount++;
        } catch (\Exception $e) {
            echo "✗ Error creating `$name` on `$table`: " . $e->getMessage() . "\n";
        }
    }
}

echo "\nMigration Summary:\n";
echo "  - Newly created indexes: $createdCount\n";
echo "  - Already active indexes: $existingCount\n";
echo "Database indexing completed successfully!\n";
?>
