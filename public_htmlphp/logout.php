<?php
// 1. Session start karna zaroori hai access karne ke liye
session_start();

// 2. Saare session variables ko unset (khali) karna
$_SESSION = array();

// 3. Agar session cookies use ho rahi hain, toh unhe expire/delete karna
// Yeh step important hai taaki purana session ID dobara use na ho sake
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// 4. Finally, session ko server se destroy karna
session_destroy();

// 5. User ko Login page ya Home page par redirect karna
header("Location: index.php"); 
exit;
?>