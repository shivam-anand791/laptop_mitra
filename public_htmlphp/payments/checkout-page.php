<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pay Online | XpertNote</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .pay-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%; }
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #002c8c; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px auto; }
        h2 { color: #002c8c; margin-bottom: 10px; }
        p { color: #64748b; margin-bottom: 30px; }
        .btn-pay { background-color: #002c8c; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 16px; width: 100%; transition: 0.3s; }
        .btn-pay:hover { background-color: #2563eb; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>

<div class="pay-card">
    <div class="loader" id="spinner"></div>
    <h2>Processing Payment</h2>
    <p>Please wait, opening secure payment gateway...</p>
    <button id="rzp-button1" class="btn-pay">Pay ₹<?php echo number_format($data['amount'] / 100, 2); ?></button>
    <br><br>
    <a href="../checkout.php" style="color: #94a3b8; text-decoration: none; font-size: 14px;">Cancel & Go Back</a>
</div>

<form name='razorpayform' action="verify-payment.php" method="POST">
    <input type="hidden" name="razorpay_payment_id" id="razorpay_payment_id">
    <input type="hidden" name="razorpay_signature"  id="razorpay_signature">
    <input type="hidden" name="razorpay_order_id" id="razorpay_order_id" value="<?php echo $data['order_id']; ?>">
</form>

<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
    // Create options object from PHP data
    var options = <?php echo json_encode($data); ?>;

    options.handler = function (response){
        document.getElementById('razorpay_payment_id').value = response.razorpay_payment_id;
        document.getElementById('razorpay_signature').value = response.razorpay_signature;
        
        // Change UI to show verification
        document.querySelector('h2').innerText = "Verifying Payment...";
        document.querySelector('p').innerText = "Please do not close this window.";
        document.getElementById('rzp-button1').style.display = 'none';
        document.getElementById('spinner').style.display = 'block';

        document.razorpayform.submit();
    };

    options.modal = {
        ondismiss: function() {
            alert('Payment cancelled by user');
            document.getElementById('spinner').style.display = 'none';
        }
    };

    var rzp1 = new Razorpay(options);

    // Auto-click the payment button
    window.onload = function(){
        document.getElementById('spinner').style.display = 'none'; // Hide spinner initially
        rzp1.open();
    };

    document.getElementById('rzp-button1').onclick = function(e){
        rzp1.open();
        e.preventDefault();
    }
</script>
</body>
</html>