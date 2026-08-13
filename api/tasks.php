<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM tasks ORDER BY created_at DESC");
    $tasks = $stmt->fetchAll();
    echo json_encode(['success' => true, 'tasks' => $tasks]);
    exit();
}

if ($method === 'POST') {
    $id = $data['id'] ?? ('TSK-' . rand(1000, 9999));
    $title = $data['title'] ?? 'New Task';
    $description = $data['description'] ?? '';
    $assignedTo = $data['assignedTo'] ?? 'All';
    $priority = $data['priority'] ?? 'Medium';
    $category = $data['category'] ?? 'General';
    $status = $data['status'] ?? 'Pending';
    $dueDate = $data['dueDate'] ?? date('Y-m-d');

    $stmt = $pdo->prepare("INSERT INTO tasks (id, title, description, assignedTo, priority, category, status, dueDate)
        VALUES (:id, :title, :description, :assignedTo, :priority, :category, :status, :dueDate)");

    $stmt->execute([
        'id' => $id, 'title' => $title, 'description' => $description,
        'assignedTo' => $assignedTo, 'priority' => $priority,
        'category' => $category, 'status' => $status, 'dueDate' => $dueDate
    ]);

    $inserted = ['id' => $id, 'title' => $title, 'description' => $description, 'assignedTo' => $assignedTo, 'priority' => $priority, 'category' => $category, 'status' => $status, 'dueDate' => $dueDate];
    echo json_encode(['success' => true, 'task' => $inserted]);
    exit();
}

if ($method === 'PUT') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Task ID missing']);
        exit();
    }

    $fields = [];
    $params = ['id' => $id];

    $allowed = ['title', 'description', 'assignedTo', 'priority', 'category', 'status', 'dueDate'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "`$field` = :$field";
            $params[$field] = $data[$field];
        }
    }

    if (!empty($fields)) {
        $sql = "UPDATE tasks SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    echo json_encode(['success' => true]);
    exit();
}

if ($method === 'DELETE') {
    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Task ID missing']);
        exit();
    }

    $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :id");
    $stmt->execute(['id' => $id]);

    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['success' => false, 'message' => 'Method not allowed']);
?>
