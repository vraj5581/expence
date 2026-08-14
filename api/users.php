<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT id, name, username, role, status, avatar, created_at FROM users ORDER BY name ASC");
    $users = $stmt->fetchAll();
    echo json_encode(['success' => true, 'users' => $users]);
    exit();
}

if ($method === 'POST') {
    $id = $data['id'] ?? strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $data['name'] ?? ('user' . rand(100, 999))));
    $name = $data['name'] ?? 'Partner';
    $username = $data['username'] ?? strtolower($name);
    $password = $data['password'] ?? 'partner123';
    $role = $data['role'] ?? 'Partner';
    $status = $data['status'] ?? 'Active';
    $avatar = $data['avatar'] ?? '';

    $stmt = $pdo->prepare("INSERT INTO users (id, name, username, password, role, status, avatar)
        VALUES (:id, :name, :username, :password, :role, :status, :avatar)
        ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), status = VALUES(status), password = VALUES(password), avatar = VALUES(avatar)");

    $stmt->execute([
        'id' => $id, 'name' => $name, 'username' => $username,
        'password' => $password, 'role' => $role, 'status' => $status, 'avatar' => $avatar
    ]);

    $inserted = ['id' => $id, 'name' => $name, 'username' => $username, 'role' => $role, 'status' => $status, 'avatar' => $avatar];
    echo json_encode(['success' => true, 'user' => $inserted]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'User ID missing']);
        exit();
    }

    $fields = [];
    $params = ['id' => $id];

    $allowed = ['name', 'username', 'password', 'role', 'status', 'avatar'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "`$field` = :$field";
            $params[$field] = $data[$field];
        }
    }

    if (!empty($fields)) {
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'User ID missing']);
        exit();
    }

    $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
    $stmt->execute(['id' => $id]);

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
