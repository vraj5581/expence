<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch();

    if (!$settings) {
        $settings = [
            'currency' => '₹',
            'currencyCode' => 'INR',
            'companyName' => 'Shukan Packaging',
            'lowBalanceAlert' => 5000,
            'approvalThreshold' => 20000
        ];
    } else {
        $settings['lowBalanceAlert'] = floatval($settings['lowBalanceAlert']);
        $settings['approvalThreshold'] = floatval($settings['approvalThreshold']);
    }

    echo json_encode(['success' => true, 'settings' => $settings]);
    exit();
}

if ($method === 'POST' || $method === 'PUT') {
    $currency = $data['currency'] ?? '₹';
    $currencyCode = $data['currencyCode'] ?? 'INR';
    $companyName = $data['companyName'] ?? 'Shukan Packaging';
    $lowBalanceAlert = floatval($data['lowBalanceAlert'] ?? 5000);
    $approvalThreshold = floatval($data['approvalThreshold'] ?? 20000);

    $stmt = $pdo->prepare("INSERT INTO settings (id, currency, currencyCode, companyName, lowBalanceAlert, approvalThreshold)
        VALUES (1, :currency, :currencyCode, :companyName, :lowBalanceAlert, :approvalThreshold)
        ON DUPLICATE KEY UPDATE currency = :currency, currencyCode = :currencyCode, companyName = :companyName,
        lowBalanceAlert = :lowBalanceAlert, approvalThreshold = :approvalThreshold");

    $stmt->execute([
        'currency' => $currency, 'currencyCode' => $currencyCode,
        'companyName' => $companyName, 'lowBalanceAlert' => $lowBalanceAlert,
        'approvalThreshold' => $approvalThreshold
    ]);

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
