<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = getJsonInput();
$action = isset($_GET['action']) ? $_GET['action'] : 'login';

if ($method === 'POST') {
    if ($action === 'login') {
        $username = trim($data['username'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Please enter username and password']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :u1 OR id = :u2 LIMIT 1");
        $stmt->execute(['u1' => $username, 'u2' => $username]);
        $user = $stmt->fetch();

        if ($user) {
            $cleanPassword = trim($password);
            $dbPass = trim($user['password']);
            $passwordMatch = ($cleanPassword === $dbPass) || password_verify($cleanPassword, $user['password']);

            if ($passwordMatch) {
                unset($user['password']);
                echo json_encode([
                    'success' => true,
                    'user' => $user,
                    'message' => 'Login successful'
                ]);
                exit();
            }
        }

        echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
        exit();
    } elseif ($action === 'change_password') {
        $username = trim($data['username'] ?? '');
        $currentPassword = trim($data['currentPassword'] ?? '');
        $newPassword = trim($data['newPassword'] ?? '');

        if (empty($username) || empty($currentPassword) || empty($newPassword)) {
            echo json_encode(['success' => false, 'message' => 'All password fields are required']);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(:u1) OR LOWER(id) = LOWER(:u2) OR LOWER(name) = LOWER(:u3) LIMIT 1");
        $stmt->execute(['u1' => $username, 'u2' => $username, 'u3' => $username]);
        $user = $stmt->fetch();

        if ($user) {
            $cleanCurrent = trim($currentPassword);
            $cleanDbPass = trim($user['password']);

            $passwordMatch = ($cleanCurrent === $cleanDbPass) || 
                             (strtolower($cleanCurrent) === strtolower($cleanDbPass)) || 
                             password_verify($cleanCurrent, $user['password']);

            if ($passwordMatch) {
                $stmtUp = $pdo->prepare("UPDATE users SET password = :newPassword WHERE id = :id");
                $stmtUp->execute(['newPassword' => $newPassword, 'id' => $user['id']]);
                echo json_encode(['success' => true, 'message' => 'Password updated successfully']);
                exit();
            }
        }

        echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
        exit();
    }
}

echo json_encode(['success' => false, 'message' => 'Invalid request method']);
?>
