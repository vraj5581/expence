<?php
// Centralized Box Weight Calculator API for Shukan Packaging ERP
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

// 1. GET: Fetch saved calculations
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM box_calculations ORDER BY created_at DESC LIMIT 100");
        $calculations = $stmt->fetchAll();
        echo json_encode([
            'success' => true,
            'calculations' => $calculations
        ]);
    } catch (\Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch calculations: ' . $e->getMessage()
        ]);
    }
    exit();
}

// 2. POST: Insert new calculation
if ($method === 'POST') {
    $id = $data['id'] ?? ('CALC-' . time() . '-' . rand(100, 999));
    $boxName = trim($data['boxName'] ?? $data['title'] ?? '');
    $inputMode = $data['inputMode'] ?? $data['mode'] ?? 'dimensions';
    $length = floatval($data['length'] ?? 0);
    $width = floatval($data['width'] ?? 0);
    $height = floatval($data['height'] ?? 0);
    $decalSize = floatval($data['decalSize'] ?? 0);
    $cuttingSize = floatval($data['cuttingSize'] ?? 0);
    $gsm1 = floatval($data['gsm1'] ?? 0);
    $gsm2 = floatval($data['gsm2'] ?? 0);
    $gsm3 = floatval($data['gsm3'] ?? 0);
    $fluting = floatval($data['fluting'] ?? 40);
    $formulaMode = $data['formulaMode'] ?? 'takeup';
    $linerWeight = floatval($data['linerWeight'] ?? $data['linerWeightGrams'] ?? 0);
    $paperWeight = floatval($data['paperWeight'] ?? $data['paperWeightGrams'] ?? 0);
    $totalWeight = floatval($data['totalWeight'] ?? $data['totalWeightGrams'] ?? 0);
    $batchQuantity = intval($data['batchQuantity'] ?? $data['qty'] ?? 1);
    $batchWeight = floatval($data['batchWeight'] ?? $data['batchWeightKg'] ?? 0);
    $paperRate = floatval($data['paperRate'] ?? $data['rate'] ?? 0);
    $totalCost = floatval($data['totalCost'] ?? $data['cost'] ?? 0);

    try {
        $stmt = $pdo->prepare("INSERT INTO box_calculations 
            (id, boxName, inputMode, length, width, height, decalSize, cuttingSize, gsm1, gsm2, gsm3, fluting, formulaMode, linerWeight, paperWeight, totalWeight, batchQuantity, batchWeight, paperRate, totalCost)
            VALUES 
            (:id, :boxName, :inputMode, :length, :width, :height, :decalSize, :cuttingSize, :gsm1, :gsm2, :gsm3, :fluting, :formulaMode, :linerWeight, :paperWeight, :totalWeight, :batchQuantity, :batchWeight, :paperRate, :totalCost)
            ON DUPLICATE KEY UPDATE
            boxName = VALUES(boxName),
            inputMode = VALUES(inputMode),
            length = VALUES(length),
            width = VALUES(width),
            height = VALUES(height),
            decalSize = VALUES(decalSize),
            cuttingSize = VALUES(cuttingSize),
            gsm1 = VALUES(gsm1),
            gsm2 = VALUES(gsm2),
            gsm3 = VALUES(gsm3),
            fluting = VALUES(fluting),
            formulaMode = VALUES(formulaMode),
            linerWeight = VALUES(linerWeight),
            paperWeight = VALUES(paperWeight),
            totalWeight = VALUES(totalWeight),
            batchQuantity = VALUES(batchQuantity),
            batchWeight = VALUES(batchWeight),
            paperRate = VALUES(paperRate),
            totalCost = VALUES(totalCost)
        ");

        $stmt->execute([
            'id' => $id,
            'boxName' => $boxName,
            'inputMode' => $inputMode,
            'length' => $length,
            'width' => $width,
            'height' => $height,
            'decalSize' => $decalSize,
            'cuttingSize' => $cuttingSize,
            'gsm1' => $gsm1,
            'gsm2' => $gsm2,
            'gsm3' => $gsm3,
            'fluting' => $fluting,
            'formulaMode' => $formulaMode,
            'linerWeight' => $linerWeight,
            'paperWeight' => $paperWeight,
            'totalWeight' => $totalWeight,
            'batchQuantity' => $batchQuantity,
            'batchWeight' => $batchWeight,
            'paperRate' => $paperRate,
            'totalCost' => $totalCost
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Calculation saved to database successfully',
            'id' => $id
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database Insert Error: ' . $e->getMessage()
        ]);
    }
    exit();
}

// 3. DELETE: Delete calculation
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? ($data['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Calculation ID missing']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM box_calculations WHERE id = :id");
        $stmt->execute(['id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Deleted successfully']);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Delete error: ' . $e->getMessage()]);
    }
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
