<?php
function sendOTP($email, $otp) {
    $subject = "XpertNote OTP Verification";
    $message = "
        <h3>Your OTP Code</h3>
        <p><b>$otp</b></p>
        <p>This OTP is valid for 10 minutes.</p>
    ";
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8\r\n";

    return mail($email, $subject, $message, $headers);
}
