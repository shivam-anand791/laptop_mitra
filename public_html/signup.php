<?php
// Enable Error Reporting (Turn off in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();
require_once 'config/database.php';
require_once 'send_mail.php'; // --- IMPORT PHPMAILER FUNCTION ---

$error = '';
$success = '';

// Redirect if already logged in
if(isset($_SESSION['user_id'])) {
    header("Location: store.php");
    exit();
}

if($_SERVER['REQUEST_METHOD'] == 'POST') {
    // 1. Sanitize & Capture Inputs
    $fullname = mysqli_real_escape_string($conn, trim($_POST['name']));
    $email = mysqli_real_escape_string($conn, trim($_POST['email']));
    
    // Capture Country Code and Phone
    $country_code = $_POST['country_code']; 
    $phone_number = trim($_POST['phone']);
    
    // Construct Full Phone for DB (e.g., +919876543210)
    $full_phone = $country_code . $phone_number;
    $full_phone_esc = mysqli_real_escape_string($conn, $full_phone);

    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];

    // --- 2. SERVER-SIDE VALIDATION RULES ---
    
    // Define exact length rules for backend validation
    $country_rules = [
        "+91" => 10, // India
        "+1"  => 10, // USA
        "+44" => 10, // UK
        "+971"=> 9,  // UAE
        "+61" => 9,  // Australia
        "+86" => 11, // China
        "+81" => 10, // Japan
        "+49" => 11, // Germany
        "+33" => 9,  // France
        "+7"  => 10  // Russia
    ];

    // Get expected length
    $expected_len = isset($country_rules[$country_code]) ? $country_rules[$country_code] : null;

    if(empty($fullname) || empty($email) || empty($phone_number) || empty($password)) {
        $error = "All fields are required.";
    } 
    elseif(!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = "Invalid email address format.";
    }
    elseif(!is_numeric($phone_number)) {
        $error = "Phone number must contain only digits.";
    }
    elseif($expected_len !== null && strlen($phone_number) !== $expected_len) {
        $error = "Invalid phone number! For $country_code, please enter exactly $expected_len digits.";
    }
    elseif($expected_len === null && (strlen($phone_number) < 7 || strlen($phone_number) > 15)) {
        $error = "Invalid phone number length.";
    }
    elseif($password !== $confirm_password) {
        $error = "Passwords do not match.";
    }
    elseif(strlen($password) < 8) {
        $error = "Password must be at least 8 characters.";
    }
    else {
        // 3. Database Check
        $check_query = "SELECT id FROM users WHERE email = '$email' OR phone = '$full_phone_esc'";
        $check_result = mysqli_query($conn, $check_query);
        
        if(mysqli_num_rows($check_result) > 0) {
            $error = "Email or Phone already registered!";
        } else {
            // 4. Create Account
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $otp = rand(100000, 999999);
            $expiry = date("Y-m-d H:i:s", strtotime("+15 minutes"));
            
            $insert_query = "INSERT INTO users (fullname, email, phone, password, otp_code, otp_expiry, is_verified, created_at) 
                             VALUES ('$fullname', '$email', '$full_phone_esc', '$hashed_password', '$otp', '$expiry', 0, NOW())";
            
            if(mysqli_query($conn, $insert_query)) {
                
                // --- 5. SEND EMAIL USING PHPMAILER ---
                // We use the function from send_mail.php
                
                if(sendOTP($email, $otp)) {
                    // Success: Redirect to Verify Page
                    $_SESSION['verify_email'] = $email;
                    header("Location: verify_otp.php");
                    exit();
                } else {
                    // Failure: Account created but mail failed
                    $error = "Account created, but OTP email failed to send. Please try logging in.";
                }

            } else {
                $error = "Database Error: " . mysqli_error($conn);
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Sign Up | LaptopMitra </title>
    
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root { 
            --primary: #4f46e5; 
            --primary-hover: #4338ca; 
            --text-dark: #0f172a; 
            --text-muted: #64748b; 
            --bg-input: #f8fafc; 
            --danger: #ef4444;
            --success: #10b981;
            --warning: #f59e0b;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        body { 
            /* THEME BACKGROUND */
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            min-height: 100vh; 
            width: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 1.5rem; 
            position: relative;
        }

        /* SVG Pattern Overlay */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 0;
        }
        
        /* Main Card Container */
        .signup-wrapper { 
            background: #ffffff; 
            width: 100%; 
            max-width: 1000px; /* Wider for signup form */
            min-height: 600px; 
            border-radius: 24px; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
            display: flex; 
            overflow: hidden; 
            position: relative; 
            z-index: 1; 
            animation: fadeInUp 0.6s ease-out; 
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* --- LEFT SIDE (Visual) --- */
        .visual-side { 
            flex: 0.8; /* Slightly smaller than form side */
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            color: white; 
            padding: 2rem; 
            text-align: center; 
            position: relative; 
            border-right: 1px solid rgba(255,255,255,0.1);
        }
        
        .visual-side::before { 
            content: ''; position: absolute; top:0; left:0; width: 100%; height: 100%; 
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); 
        }
        
        .visual-content { z-index: 2; }
        .visual-icon { font-size: 3.5rem; margin-bottom: 1.5rem; opacity: 0.95; }
        .visual-side h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; }
        .visual-side p { font-size: 0.95rem; opacity: 0.9; line-height: 1.6; max-width: 80%; margin: 0 auto; }
        
        /* --- RIGHT SIDE (Form) --- */
        .form-side { 
            flex: 1.2; 
            padding: 3rem; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            position: relative; 
            background: #fff;
        }

        /* Top Navigation Icons */
        .nav-link { 
            position: absolute; top: 2rem; color: #94a3b8; font-size: 1.25rem; 
            cursor: pointer; transition: all 0.2s ease; text-decoration: none; 
            width: 40px; height: 40px; display: flex; align-items: center; 
            justify-content: center; border-radius: 50%;
        }
        .nav-link:hover { color: var(--primary); background: #f1f5f9; }
        .home-link { right: 2rem; }

        /* Logo Styling */
        .logo-container { text-align: center; margin-bottom: 1.5rem; }
        .logo-img { height: 55px; width: auto; object-fit: contain; }
        
        .header-text { margin-bottom: 2rem; text-align: center; }
        .header-text h1 { font-size: 1.6rem; color: var(--text-dark); font-weight: 800; margin-bottom: 0.5rem; }
        .header-text p { color: var(--text-muted); font-size: 0.9rem; }
        
        /* --- GRID SYSTEM for Signup --- */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .full-width { grid-column: 1 / -1; }

        /* Standard Form Elements */
        .form-group { margin-bottom: 0; }
        .form-label { display: block; margin-bottom: 0.4rem; color: var(--text-dark); font-weight: 700; font-size: 0.85rem; }
        
        .input-group { position: relative; display: flex; }
        
        .input-group i.icon-left {
            position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
            color: #94a3b8; font-size: 0.9rem; transition: color 0.3s; z-index: 5;
        }
        
        .input-group i.icon-right {
            position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
            color: #94a3b8; font-size: 0.9rem; transition: color 0.3s; cursor: pointer; z-index: 5;
        }
        .input-group i.icon-right:hover { color: var(--primary); }

        .form-control { 
            width: 100%; padding: 0.8rem 1rem 0.8rem 2.5rem; /* Left padding for icon */
            background: var(--bg-input); border: 2px solid #e2e8f0; border-radius: 12px; 
            font-size: 0.9rem; color: var(--text-dark); transition: all 0.3s ease; font-weight: 500;
        }
        
        .form-control:focus { outline: none; background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        .form-control:focus + i.icon-left { color: var(--primary); }
        .form-control.error { border-color: var(--danger); background: #fef2f2; }

        /* Country Select Styling */
        .country-select {
            width: 110px; margin-right: 10px; padding: 0.8rem 0.5rem 0.8rem 0.8rem;
            background: var(--bg-input); border: 2px solid #e2e8f0; border-radius: 12px;
            font-size: 0.9rem; font-weight: 600; color: var(--text-dark); cursor: pointer;
            transition: all 0.3s ease; appearance: none;
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 0.65em auto;
        }
        .country-select:focus { outline: none; border-color: var(--primary); background-color: #fff; }

        /* Error Text & Strength Bar */
        .input-error-msg { color: var(--danger); font-size: 0.75rem; margin-top: 4px; display: none; font-weight: 600; }
        
        .password-strength { height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .strength-bar { height: 100%; width: 0%; transition: width 0.3s, background-color 0.3s; }
        .weak { width: 33%; background: var(--danger); } .medium { width: 66%; background: var(--warning); } .strong { width: 100%; background: var(--success); }

        /* Submit Button */
        .btn-submit { 
            width: 100%; padding: 1rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
            color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; 
            transition: all 0.3s ease; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
            margin-top: 1rem;
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.5); }
        
        .alert { 
            background-color: #fef2f2; color: #ef4444; padding: 0.85rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; 
            display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; border: 1px solid #fecaca; font-weight: 600;
        }

        .footer-links { text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-muted); }
        .footer-links a { color: var(--primary); text-decoration: none; font-weight: 700; }
        .footer-links a:hover { text-decoration: underline; }

        /* --- MOBILE RESPONSIVENESS --- */
        @media (max-width: 900px) {
            body { padding: 1rem; }
            .signup-wrapper { flex-direction: column; width: 100%; max-width: 500px; min-height: auto; }
            .visual-side { display: none; } 
            .form-side { padding: 2.5rem 1.5rem; }
            .form-grid { grid-template-columns: 1fr; } /* Stack inputs on mobile */
            .logo-img { height: 42px; }
            .nav-link { top: 1rem; width: 35px; height: 35px; }
            .home-link { right: 1rem; }
        }
    </style>
</head>
<body>
    <div class="signup-wrapper">
        <div class="visual-side">
            <div class="visual-content">
                <p>Powered by </p>
                <img src="assets/logo.png" alt="laptop mitra Logo" class="logo-img">
                <p>Best digital marketing company in India </p>
            </div>
        </div>

        <div class="form-side">
            
            <a href="https://www.laptopmitra.com" class="nav-link home-link" title="Go to Home">
                <i class="fas fa-house"></i>
            </a>

            <div class="logo-container">
                <img src="assets/logo-laptop-mitra.png" alt="laptop mitra Logo" class="logo-img">
            </div>

            <div class="header-text">
                <h1>Create Account</h1>
                <p>Enter your details to sign up.</p>
            </div>

            <?php if($error): ?>
                <div class="alert"><i class="fas fa-circle-exclamation"></i><span><?= htmlspecialchars($error); ?></span></div>
            <?php endif; ?>

            <form method="POST" action="" id="signupForm" novalidate>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <div class="input-group">
                            <input type="text" name="name" class="form-control" placeholder="John Doe" required value="<?= isset($_POST['name']) ? htmlspecialchars($_POST['name']) : '' ?>">
                            <i class="fas fa-user icon-left"></i>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <div class="input-group">
                            <input type="email" id="email" name="email" class="form-control" placeholder="name@company.com" required value="<?= isset($_POST['email']) ? htmlspecialchars($_POST['email']) : '' ?>" onkeyup="validateEmail()">
                            <i class="fas fa-envelope icon-left"></i>
                        </div>
                        <div class="input-error-msg" id="emailError">Please enter a valid email.</div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label">Phone Number</label>
                        <div class="input-group">
                            <select name="country_code" id="country_code" class="country-select" onchange="updatePhoneRules()">
                                <option value="+91" selected>🇮🇳 +91</option>
                                <option value="+1">🇺🇸 +1</option>
                                <option value="+44">🇬🇧 +44</option>
                                <option value="+971">🇦🇪 +971</option>
                                <option value="+61">🇦🇺 +61</option>
                                <option value="+86">🇨🇳 +86</option>
                                <option value="+81">🇯🇵 +81</option>
                                <option value="+49">🇩🇪 +49</option>
                                <option value="+33">🇫🇷 +33</option>
                                <option value="+7">🇷🇺 +7</option>
                            </select>
                            
                            <div style="position: relative; width: 100%;">
                                <input type="tel" name="phone" id="phone" class="form-control" placeholder="98765 43210" required value="<?= isset($_POST['phone']) ? htmlspecialchars($_POST['phone']) : '' ?>">
                                <i class="fas fa-phone icon-left"></i>
                            </div>
                        </div>
                        <div class="input-error-msg" id="phoneError">Invalid phone length.</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div class="input-group">
                            <input type="password" id="password" name="password" class="form-control" placeholder="••••••••" required onkeyup="checkStrength()">
                            <i class="fas fa-lock icon-left"></i>
                            <i class="fas fa-eye icon-right" onclick="togglePassword('password', this)"></i>
                        </div>
                        <div class="password-strength"><div class="strength-bar" id="strengthBar"></div></div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <div class="input-group">
                            <input type="password" id="confirm_password" name="confirm_password" class="form-control" placeholder="••••••••" required onkeyup="checkMatch()">
                            <i class="fas fa-lock icon-left"></i>
                            <i class="fas fa-eye icon-right" onclick="togglePassword('confirm_password', this)"></i>
                        </div>
                        <div class="input-error-msg" id="passError">Passwords do not match.</div>
                    </div>
                </div>
                
                <button type="submit" class="btn-submit">Create Account <i class="fas fa-arrow-right" style="margin-left: 8px;"></i></button>
            </form>

            <div class="footer-links">
                Already have an account? <a href="login.php">Sign In</a>
            </div>
        </div>
    </div>

    <script>
        // --- Toggle Password Visibility ---
        function togglePassword(fieldId, icon) {
            const input = document.getElementById(fieldId);
            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }

        // --- Country Code Rules ---
        const phoneRules = {
            "+91":  { len: 10, ph: "98765 43210" },
            "+1":   { len: 10, ph: "202 555 0123" },
            "+44":  { len: 10, ph: "7911 123456" },
            "+971": { len: 9,  ph: "50 123 4567" },
            "+61":  { len: 9,  ph: "412 345 678" },
            "+86":  { len: 11, ph: "138 0013 8000" },
            "+81":  { len: 10, ph: "90 1234 5678" },
            "+49":  { len: 11, ph: "151 23456789" },
            "+33":  { len: 9,  ph: "6 12 34 56 78" },
            "+7":   { len: 10, ph: "900 123 45 67" } 
        };

        const phoneInput = document.getElementById('phone');
        const countrySelect = document.getElementById('country_code');
        const phoneErr = document.getElementById('phoneError');

        function updatePhoneRules() {
            const code = countrySelect.value;
            const rule = phoneRules[code] || { len: 10, ph: "Phone Number" };
            
            phoneInput.placeholder = rule.ph;
            phoneInput.maxLength = rule.len;
            phoneInput.classList.remove('error');
            phoneErr.style.display = 'none';
        }

        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });

        // --- Strength Checker ---
        function checkStrength() {
            const val = document.getElementById('password').value;
            const bar = document.getElementById('strengthBar');
            let score = 0;
            if (val.length >= 8) score++;
            if (val.match(/[0-9]/)) score++;
            if (val.match(/[!@#$%^&*]/)) score++;
            
            bar.className = 'strength-bar';
            if (score === 1) { bar.classList.add('weak'); bar.style.width = '33%'; }
            else if (score === 2) { bar.classList.add('medium'); bar.style.width = '66%'; }
            else if (score >= 3) { bar.classList.add('strong'); bar.style.width = '100%'; }
            else { bar.style.width = '0%'; }
            
            checkMatch(); 
        }

        // --- Match Checker ---
        function checkMatch() {
            const p1 = document.getElementById('password').value;
            const p2 = document.getElementById('confirm_password').value;
            const err = document.getElementById('passError');

            if (p2.length > 0 && p1 !== p2) {
                document.getElementById('confirm_password').classList.add('error');
                err.style.display = 'block';
                return false;
            } else {
                document.getElementById('confirm_password').classList.remove('error');
                err.style.display = 'none';
                return true;
            }
        }

        // --- Email Regex ---
        function validateEmail() {
            const emailInput = document.getElementById('email');
            const emailErr = document.getElementById('emailError');
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (emailInput.value.length > 0 && !regex.test(emailInput.value)) {
                emailInput.classList.add('error');
                emailErr.style.display = 'block';
                return false;
            } else {
                emailInput.classList.remove('error');
                emailErr.style.display = 'none';
                return true;
            }
        }

        // --- Submit Logic ---
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            let isValid = true;
            
            const code = countrySelect.value;
            const rule = phoneRules[code] || { len: 10 };
            const phoneVal = phoneInput.value;

            if (phoneVal.length !== rule.len) {
                isValid = false;
                phoneInput.classList.add('error');
                phoneErr.innerText = `Please enter exactly ${rule.len} digits for ${code}`;
                phoneErr.style.display = 'block';
            }

            if (!validateEmail()) isValid = false;
            if (!checkMatch()) isValid = false;

            if (!isValid) e.preventDefault();
        });

        // Initialize
        updatePhoneRules();
    </script>
</body>
</html>