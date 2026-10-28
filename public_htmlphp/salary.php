<?php
// salary_slip.php

// -----------------------------------------------------------------------------
// 1. CONFIGURATION (FIXED DETAILS)
// -----------------------------------------------------------------------------
// These details are fixed and will not appear in the edit form
$FIXED_COMPANY   = "XpertNote Analytics LLP"; // Change this to your actual company name
$FIXED_ADDRESS_1 = "Palam, Raj Nagar Part 2";
$FIXED_ADDRESS_2 = "New Delhi, India";
// $FIXED_CIN       = "CIN: U74999WB2017PLC221672";

// -----------------------------------------------------------------------------
// 2. HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function getIndianCurrency($number) {
    $decimal = round($number - ($no = floor($number)), 2) * 100;
    $digits_length = strlen($no);
    $i = 0;
    $str = array();
    $words = array(0 => '', 1 => 'One', 2 => 'Two',
        3 => 'Three', 4 => 'Four', 5 => 'Five', 6 => 'Six',
        7 => 'Seven', 8 => 'Eight', 9 => 'Nine',
        10 => 'Ten', 11 => 'Eleven', 12 => 'Twelve',
        13 => 'Thirteen', 14 => 'Fourteen', 15 => 'Fifteen',
        16 => 'Sixteen', 17 => 'Seventeen', 18 => 'Eighteen',
        19 => 'Nineteen', 20 => 'Twenty', 30 => 'Thirty',
        40 => 'Forty', 50 => 'Fifty', 60 => 'Sixty',
        70 => 'Seventy', 80 => 'Eighty', 90 => 'Ninety');
    $digits = array('', 'Hundred','Thousand','Lakh', 'Crore');
    while( $i < $digits_length ) {
        $divider = ($i == 2) ? 10 : 100;
        $number = floor($no % $divider);
        $no = floor($no / $divider);
        $i += $divider == 10 ? 1 : 2;
        if ($number) {
            $plural = (($counter = count($str)) && $number > 9) ? 's' : null;
            $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
            $str [] = ($number < 21) ? $words[$number].' '. $digits[$counter]. $hundred : $words[floor($number / 10) * 10].' '.$words[$number % 10]. ' '.$digits[$counter]. $hundred;
        } else $str[] = null;
    }
    $Rupees = implode('', array_reverse($str));
    return ($Rupees ? $Rupees . ' only' : '');
}

// -----------------------------------------------------------------------------
// 3. DATA PROCESSING
// -----------------------------------------------------------------------------

$show_slip = false;
$d = []; 

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $show_slip = true;
    $d = $_POST;
    
    // Calculations
    $d['total_earnings'] = $d['basic'] + $d['hra'] + $d['conveyance'] + $d['special'] + $d['medical'];
    $d['total_deductions'] = $d['pf'] + $d['tax'] + $d['other_deductions'];
    $d['net_pay'] = $d['total_earnings'] - $d['total_deductions'];
    $d['amount_words'] = "Rupees " . getIndianCurrency($d['net_pay']);
} else {
    // DEFAULT DATA (Company details removed from here as they are fixed above)
    $d = [
        'month_year' => 'Jan 2026',
        'emp_name' => 'Meena Rawat',
        'emp_id' => '202526',
        'designation' => 'Officer - Digital Marketing',
        'role' => 'Officer Digital Marketing',
        'department' => 'Digital Marketing',
        'doj' => '01 Nov, 2023',
        'pan' => 'CMIPM9101Q',
        'uan' => '100580044552',
        'pf_no' => 'WBCAL1989627000',
        'esi_no' => '2014702934',
        'bank_name' => 'SBI',
        'acc_no' => '31368559801',
        'std_days' => '31.00',
        'paid_days' => '31.00',
        'basic' => 12500,
        'hra' => 6250,
        'conveyance' => 3000,
        'special' => 6801,
        'medical' => 1042,
        'pf' => 1800,
        'tax' => 150,
        'other_deductions' => 0
    ];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Salary Slip Generator</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary-color: #2c3e50; /* Dark Slate */
            --accent-color: #3498db;  /* Blue */
            --bg-color: #f8f9fa;
            --border-color: #dfe6e9;
        }

        body { 
            font-family: 'Inter', sans-serif; 
            background: var(--bg-color); 
            margin: 0; 
            padding: 20px; 
            color: #333; 
        }

        /* --------------------------------------------------
           FORM UI STYLES
           -------------------------------------------------- */
        .admin-wrapper {
            max-width: 900px;
            margin: 0 auto;
        }

        .admin-panel { 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.08); 
            overflow: hidden;
            margin-bottom: 40px;
        }

        .admin-header {
            background: var(--primary-color);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .admin-header h2 { margin: 0; font-size: 20px; font-weight: 600; }

        .admin-body { padding: 30px; }

        .section-title { 
            font-size: 14px; 
            text-transform: uppercase; 
            letter-spacing: 1px;
            color: var(--accent-color); 
            font-weight: 700; 
            margin: 25px 0 15px 0; 
            padding-bottom: 5px;
            border-bottom: 2px solid var(--border-color);
        }
        .section-title:first-child { margin-top: 0; }

        .form-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
            gap: 20px; 
        }

        .form-group { display: flex; flex-direction: column; }
        .form-group label { 
            font-size: 13px; 
            font-weight: 600; 
            margin-bottom: 8px; 
            color: #555; 
        }
        .form-group input { 
            padding: 10px 12px; 
            border: 1px solid #cbd5e0; 
            border-radius: 6px; 
            font-size: 14px; 
            transition: border-color 0.3s;
        }
        .form-group input:focus { 
            outline: none; 
            border-color: var(--accent-color); 
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .btn-submit { 
            background: #10b981; /* Green */
            color: white; 
            border: none; 
            padding: 15px 30px; 
            font-size: 16px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600; 
            width: 100%;
            margin-top: 30px;
            transition: background 0.3s;
        }
        .btn-submit:hover { background: #059669; }

        /* --------------------------------------------------
           ACTION BAR (Buttons)
           -------------------------------------------------- */
        .action-bar { 
            display: flex; 
            justify-content: center; /* Center buttons */
            gap: 15px; 
            margin-top: 30px; 
            margin-bottom: 50px;
        }
        .btn-print { 
            background: var(--primary-color); 
            color: white; 
            border: none; 
            padding: 12px 30px; 
            cursor: pointer; 
            border-radius: 6px; 
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .btn-back {
            background: #7f8c8d;
            color: white;
            border: none;
            padding: 12px 30px;
            cursor: pointer;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            display: inline-block;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        /* --------------------------------------------------
           SALARY SLIP STYLES (Print Design)
           -------------------------------------------------- */
        .salary-slip {
            background: white;
            width: 210mm; 
            min-height: 297mm; 
            margin: 0 auto;
            padding: 15mm; 
            box-sizing: border-box;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            position: relative;
            font-size: 12px; 
            color: #000;
        }

        /* Common Table Styles */
        table { width: 100%; border-collapse: collapse; }
        
        /* Header Section */
        .header-table td { vertical-align: middle; }
        .company-name { 
            font-size: 22px; 
            font-weight: 800; 
            color: var(--primary-color); 
            text-transform: uppercase; 
            margin-bottom: 5px; 
        }
        .company-address { font-size: 13px; line-height: 1.4; color: #555; }
        
        .slip-title { 
            text-align: center; 
            margin: 20px 0; 
            padding: 8px;
            background: #f1f2f6;
            border-top: 2px solid var(--primary-color);
            border-bottom: 2px solid var(--primary-color);
            font-weight: 700;
            font-size: 16px;
            text-transform: uppercase;
        }

        /* Employee Grid */
        .emp-grid-table { margin-bottom: 20px; width: 100%; }
        .emp-grid-table td { padding: 6px 4px; border-bottom: 1px solid #eee; }
        .label { font-weight: 700; color: #444; width: 15%; }
        .value { color: #000; width: 35%; }

        /* Earnings & Deductions Split */
        .financial-table { width: 100%; border: 1px solid #000; margin-bottom: 20px; }
        .financial-header { 
            background: var(--primary-color); 
            color: white; 
            font-weight: bold; 
            text-align: center; 
            padding: 8px; 
            text-transform: uppercase;
            font-size: 12px;
            -webkit-print-color-adjust: exact; 
        }
        .financial-col { width: 50%; vertical-align: top; border-right: 1px solid #000; padding: 0; }
        .financial-col:last-child { border-right: none; }
        
        .inner-table td { padding: 6px 10px; border-bottom: 1px dashed #ccc; }
        .inner-table tr:last-child td { border-bottom: none; }
        .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
        
        .total-row { 
            background: #e9ecef; 
            font-weight: bold; 
            border-top: 1px solid #000 !important; 
            -webkit-print-color-adjust: exact;
        }

        /* Net Pay Box */
        .net-pay-box { 
            border: 2px solid var(--primary-color); 
            background: #f8fcfd;
            padding: 15px;
            margin-top: 10px;
        }
        .amount-words { margin-top: 5px; font-style: italic; color: #555; font-size: 13px; }

        /* Footer */
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
        
        /* --------------------------------------------------
           PRINT MEDIA QUERY
           -------------------------------------------------- */
        @media print {
            body { margin: 0; padding: 0; background: white; }
            .no-print, .admin-wrapper, .btn-print, .action-bar { display: none !important; }
            .container { width: 100%; margin: 0; }
            .salary-slip { 
                width: 100%; 
                margin: 0; 
                border: none; 
                box-shadow: none; 
                padding: 10mm;
            }
            @page { size: A4; margin: 0; }
        }
    </style>
</head>
<body>

<?php if(!$show_slip): ?>
<div class="admin-wrapper no-print">
    <div class="admin-panel">
        <div class="admin-header">
            <h2>📝 Payroll Entry System</h2>
            <span style="opacity: 0.8; font-size: 14px;">Generates PDF-ready Slip</span>
        </div>
        
        <div class="admin-body">
            <form method="POST" action="">
                
                <div style="background: #e3f2fd; color: #0d47a1; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px;">
                    <strong>Note:</strong> Company Name and Address are fixed in the system and will appear automatically on the slip.
                </div>

                <div class="section-title">👤 Employee Details</div>
                <div class="form-grid">
                     <div class="form-group"><label>Month & Year</label><input type="text" name="month_year" value="<?php echo $d['month_year']; ?>"></div>
                    <div class="form-group"><label>Employee Name</label><input type="text" name="emp_name" value="<?php echo $d['emp_name']; ?>"></div>
                    <div class="form-group"><label>Employee ID</label><input type="text" name="emp_id" value="<?php echo $d['emp_id']; ?>"></div>
                    <div class="form-group"><label>Designation</label><input type="text" name="designation" value="<?php echo $d['designation']; ?>"></div>
                    <div class="form-group"><label>Department</label><input type="text" name="department" value="<?php echo $d['department']; ?>"></div>
                    <div class="form-group"><label>Role</label><input type="text" name="role" value="<?php echo $d['role']; ?>"></div>
                    <div class="form-group"><label>Date of Joining</label><input type="text" name="doj" value="<?php echo $d['doj']; ?>"></div>
                    <div class="form-group"><label>PAN Number</label><input type="text" name="pan" value="<?php echo $d['pan']; ?>"></div>
                    <div class="form-group"><label>UAN Number</label><input type="text" name="uan" value="<?php echo $d['uan']; ?>"></div>
                    <div class="form-group"><label>PF No</label><input type="text" name="pf_no" value="<?php echo $d['pf_no']; ?>"></div>
                    <div class="form-group"><label>ESI No</label><input type="text" name="esi_no" value="<?php echo $d['esi_no']; ?>"></div>
                    <div class="form-group"><label>Bank Name</label><input type="text" name="bank_name" value="<?php echo $d['bank_name']; ?>"></div>
                    <div class="form-group"><label>Account No</label><input type="text" name="acc_no" value="<?php echo $d['acc_no']; ?>"></div>
                    <div class="form-group"><label>Standard Days</label><input type="text" name="std_days" value="<?php echo $d['std_days']; ?>"></div>
                    <div class="form-group"><label>Paid Days</label><input type="text" name="paid_days" value="<?php echo $d['paid_days']; ?>"></div>
                </div>

                <div class="section-title">💰 Earnings (INR)</div>
                <div class="form-grid">
                    <div class="form-group"><label>Basic Salary</label><input type="number" step="0.01" name="basic" value="<?php echo $d['basic']; ?>"></div>
                    <div class="form-group"><label>HRA</label><input type="number" step="0.01" name="hra" value="<?php echo $d['hra']; ?>"></div>
                    <div class="form-group"><label>Conveyance</label><input type="number" step="0.01" name="conveyance" value="<?php echo $d['conveyance']; ?>"></div>
                    <div class="form-group"><label>Special Allowance</label><input type="number" step="0.01" name="special" value="<?php echo $d['special']; ?>"></div>
                    <div class="form-group"><label>Medical Allowance</label><input type="number" step="0.01" name="medical" value="<?php echo $d['medical']; ?>"></div>
                </div>

                <div class="section-title">📉 Deductions (INR)</div>
                <div class="form-grid">
                    <div class="form-group"><label>Employee PF</label><input type="number" step="0.01" name="pf" value="<?php echo $d['pf']; ?>"></div>
                    <div class="form-group"><label>Professional Tax</label><input type="number" step="0.01" name="tax" value="<?php echo $d['tax']; ?>"></div>
                    <div class="form-group"><label>Other Deductions</label><input type="number" step="0.01" name="other_deductions" value="<?php echo $d['other_deductions']; ?>"></div>
                </div>

                <button type="submit" class="btn-submit">Generate Salary Slip</button>
            </form>
        </div>
    </div>
</div>
<?php endif; ?>

<?php if($show_slip): ?>
<div class="container">
    
    <div class="salary-slip">
        <table class="header-table" style="margin-bottom: 20px; border-bottom: 2px solid #2c3e50; padding-bottom: 15px;">
            <tr>
                <td style="width: 30%;">
                    <img src="assets/logo.png" alt="Company Logo" style="max-height: 60px;">
                </td>
                <td style="width: 70%; text-align: right;">
                    <div class="company-name"><?php echo $FIXED_COMPANY; ?></div>
                    <div class="company-address">
                        <?php echo $FIXED_ADDRESS_1; ?><br>
                        <?php echo $FIXED_ADDRESS_2; ?><br>
                        <?php echo $FIXED_CIN; ?>
                    </div>
                </td>
            </tr>
        </table>

        <div class="slip-title">
            Pay slip for <?php echo htmlspecialchars($d['month_year']); ?>
        </div>

        <table class="emp-grid-table">
            <tr>
                <td class="label">Emp No:</td>
                <td class="value"><?php echo htmlspecialchars($d['emp_id']); ?></td>
                <td class="label">Name:</td>
                <td class="value"><?php echo htmlspecialchars($d['emp_name']); ?></td>
            </tr>
            <tr>
                <td class="label">Designation:</td>
                <td class="value"><?php echo htmlspecialchars($d['designation']); ?></td>
                <td class="label">Department:</td>
                <td class="value"><?php echo htmlspecialchars($d['department']); ?></td>
            </tr>
            <tr>
                <td class="label">Role:</td>
                <td class="value"><?php echo htmlspecialchars($d['role']); ?></td>
                <td class="label">Emp Type:</td>
                <td class="value">Confirmed-Regular</td>
            </tr>
            <tr>
                <td class="label">Date of Joining:</td>
                <td class="value"><?php echo htmlspecialchars($d['doj']); ?></td>
                <td class="label">PF No:</td>
                <td class="value"><?php echo htmlspecialchars($d['pf_no']); ?></td>
            </tr>
            <tr>
                <td class="label">PAN:</td>
                <td class="value"><?php echo htmlspecialchars($d['pan']); ?></td>
                <td class="label">ESI No:</td>
                <td class="value"><?php echo htmlspecialchars($d['esi_no']); ?></td>
            </tr>
            <tr>
                <td class="label">UAN:</td>
                <td class="value"><?php echo htmlspecialchars($d['uan']); ?></td>
                <td class="label">Paid Days:</td>
                <td class="value"><?php echo htmlspecialchars($d['paid_days']); ?> / <?php echo htmlspecialchars($d['std_days']); ?></td>
            </tr>
            <tr>
                <td class="label">Bank Name:</td>
                <td class="value"><?php echo htmlspecialchars($d['bank_name']); ?></td>
                <td class="label">Account No:</td>
                <td class="value"><?php echo htmlspecialchars($d['acc_no']); ?></td>
            </tr>
        </table>

        <table class="financial-table">
            <thead>
                <tr>
                    <th class="financial-col financial-header">Earnings</th>
                    <th class="financial-col financial-header">Deductions</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="financial-col">
                        <table class="inner-table">
                            <tr>
                                <td>Basic Salary</td>
                                <td class="amount"><?php echo number_format($d['basic'], 2); ?></td>
                            </tr>
                            <tr>
                                <td>HRA</td>
                                <td class="amount"><?php echo number_format($d['hra'], 2); ?></td>
                            </tr>
                            <tr>
                                <td>Conveyance Allowance</td>
                                <td class="amount"><?php echo number_format($d['conveyance'], 2); ?></td>
                            </tr>
                            <tr>
                                <td>Special Allowance</td>
                                <td class="amount"><?php echo number_format($d['special'], 2); ?></td>
                            </tr>
                            <tr>
                                <td>Medical Allowance</td>
                                <td class="amount"><?php echo number_format($d['medical'], 2); ?></td>
                            </tr>
                            <tr><td style="color:transparent">.</td><td></td></tr>
                            
                            <tr class="total-row">
                                <td>Total Earnings</td>
                                <td class="amount">INR <?php echo number_format($d['total_earnings'], 2); ?></td>
                            </tr>
                        </table>
                    </td>

                    <td class="financial-col">
                        <table class="inner-table">
                            <tr>
                                <td>Employee PF</td>
                                <td class="amount"><?php echo number_format($d['pf'], 2); ?></td>
                            </tr>
                            <tr>
                                <td>Professional Tax</td>
                                <td class="amount"><?php echo number_format($d['tax'], 2); ?></td>
                            </tr>
                            <?php if($d['other_deductions'] > 0): ?>
                            <tr>
                                <td>Other Deductions</td>
                                <td class="amount"><?php echo number_format($d['other_deductions'], 2); ?></td>
                            </tr>
                            <?php else: ?>
                            <tr><td style="color:transparent">.</td><td></td></tr>
                            <?php endif; ?>
                            
                            <tr><td style="color:transparent">.</td><td></td></tr>
                            <tr><td style="color:transparent">.</td><td></td></tr>
                            
                            <tr class="total-row">
                                <td>Total Deductions</td>
                                <td class="amount">INR <?php echo number_format($d['total_deductions'], 2); ?></td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="net-pay-box">
            <table style="margin: 0;">
                <tr>
                    <td style="font-weight: 700; font-size: 15px;">Net Amount Payable:</td>
                    <td style="text-align: right; font-weight: 800; font-size: 18px;">INR <?php echo number_format($d['net_pay'], 2); ?></td>
                </tr>
                <tr>
                    <td colspan="2" class="amount-words">
                        (<?php echo $d['amount_words']; ?>)
                    </td>
                </tr>
            </table>
        </div>

        
    </div>
    <div class="action-bar no-print">
        <button onclick="window.history.back()" class="btn-back">« Edit Data</button>
        <button onclick="window.print()" class="btn-print">🖨️ Print / Save as PDF</button>
    </div>

</div>
<?php endif; ?>

</body>
</html>