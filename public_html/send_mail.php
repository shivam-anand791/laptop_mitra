<?php
file_put_contents('debug.txt', print_r($_POST, true));
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

require 'PHPMailer/Exception.php';
require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';

function sendOTP($toEmail, $otp) {
    $mail = new PHPMailer(true);

    try {
        $my_email = 'anuragkas29@gmail.com'; 
        $my_pass  = 'bdqivbkygdhpfpfq';         

        $mail->isSMTP();                                            
        $mail->Host       = 'smtp.gmail.com';                     
        $mail->SMTPAuth   = true;                                   
        $mail->Username   = $my_email;                     
        $mail->Password   = $my_pass;                               
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;            
        $mail->Port       = 465;                                    

        $mail->setFrom($my_email, 'LaptopMitra Security');
        $mail->addAddress($toEmail);     

        $mail->isHTML(true);                                  
        $mail->Subject = 'Verify Your Email | LaptopMitra OTP';

        $mail->Body = "
        <div style='background: linear-gradient(135deg,#4f46e5,#4338ca); padding:40px; font-family: Plus Jakarta Sans, Arial, sans-serif;'>
            <div style='max-width:520px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.2);'>
                
                <div style='text-align:center; padding:30px 20px; background:#f8fafc;'>
                    <img src='https://www.laptopmitra.com/assets/logo-laptop-mitra.png' style='height:50px;margin-bottom:10px;'>
                    <h2 style='margin:0;color:#1e293b;'>Email Verification</h2>
                </div>

                <div style='padding:35px; text-align:center;'>
                    <p style='font-size:15px;color:#475569;'>Use the OTP below to verify your LaptopMitra account.</p>
                    
                    <div style='margin:25px 0;'>
                        <span style='display:inline-block; background:#eef2ff; color:#4f46e5; font-size:28px; letter-spacing:6px; padding:14px 28px; border-radius:10px; font-weight:700;'>
                            $otp
                        </span>
                    </div>

                    <p style='font-size:13px;color:#64748b;'>This code is valid for <b>15 minutes</b>. Do not share it with anyone.</p>

                    <div style='margin-top:30px; font-size:13px; color:#94a3b8;'> © ".date('Y')." LaptopMitra. All rights reserved.
                    </div>
                </div>

            </div>
        </div>";

        $mail->send();
        return true;

    } catch (Exception $e) {
        return false;
    }
}
?>
