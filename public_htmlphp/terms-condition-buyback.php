<?php
session_start();
// Basic Setup
$pageTitle = "Buyback Guarantee - Terms & Conditions";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> | Laptop Mitra</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        .prose-headings { color: #1e293b; }
        .prose-p { color: #475569; }
    </style>
</head>
<body class="flex flex-col min-h-screen">

    <?php include 'includes/header.php'; ?>

    <div class="bg-gradient-to-r from-sky-600 to-blue-900 text-white py-16">
        <div class="max-w-4xl mx-auto px-4 text-center">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-lg">
                <i class="fa-solid fa-coins text-3xl text-yellow-300"></i>
            </div>
            <h1 class="text-3xl md:text-5xl font-extrabold mb-4">Lifetime Buyback Guarantee</h1>
            <p class="text-lg text-sky-100 max-w-2xl mx-auto">We promise to buy back your laptop at an assured price, anytime within 36 months of your purchase.</p>
        </div>
    </div>

    <main class="flex-grow py-12 px-4 sm:px-6">
        <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            <div class="p-8 border-b border-slate-100">
                <h2 class="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-chart-line text-sky-600"></i> Assured Buyback Value
                </h2>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-slate-600 rounded-lg overflow-hidden border border-slate-200">
                        <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="px-6 py-4 font-bold">Ownership Period</th>
                                <th class="px-6 py-4 font-bold text-sky-700">Buyback Value (%)</th>
                                <th class="px-6 py-4 font-bold">Example (Laptop Price ₹30,000)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr class="bg-sky-50/50">
                                <td class="px-6 py-4 font-medium text-slate-900">0 - 6 Months</td>
                                <td class="px-6 py-4 font-bold text-sky-700">70%</td>
                                <td class="px-6 py-4 font-medium">₹21,000</td>
                            </tr>
                            <tr>
                                <td class="px-6 py-4 font-medium text-slate-900">6 - 12 Months</td>
                                <td class="px-6 py-4 font-bold text-sky-700">60%</td>
                                <td class="px-6 py-4 font-medium">₹18,000</td>
                            </tr>
                            <tr class="bg-slate-50/50">
                                <td class="px-6 py-4 font-medium text-slate-900">12 - 18 Months</td>
                                <td class="px-6 py-4 font-bold text-sky-700">50%</td>
                                <td class="px-6 py-4 font-medium">₹15,000</td>
                            </tr>
                            <tr>
                                <td class="px-6 py-4 font-medium text-slate-900">18 - 24 Months</td>
                                <td class="px-6 py-4 font-bold text-sky-700">40%</td>
                                <td class="px-6 py-4 font-medium">₹12,000</td>
                            </tr>
                            <tr class="bg-slate-50/50">
                                <td class="px-6 py-4 font-medium text-slate-900">24 - 30 Months</td>
                                <td class="px-6 py-4 font-bold text-sky-700">30%</td>
                                <td class="px-6 py-4 font-medium">₹9,000</td>
                            </tr>
                            <tr>
                                <td class="px-6 py-4 font-medium text-slate-900">30 - 36 Months</td>
                                <td class="px-6 py-4 font-bold text-sky-700">20%</td>
                                <td class="px-6 py-4 font-medium">₹6,000</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p class="text-xs text-slate-400 mt-3">* Buyback value is calculated on the base invoice value (excluding taxes and accessories).</p>
            </div>

            <div class="p-8 space-y-8">
                
                <section>
                    <h3 class="text-lg font-bold text-slate-900 mb-3">1. Eligibility Criteria</h3>
                    <ul class="list-disc list-outside ml-5 space-y-2 text-slate-600 text-sm leading-relaxed">
                        <li>The laptop must be in <strong>working condition</strong> (switches on, boots into OS).</li>
                        <li>Original invoice must be produced at the time of buyback request.</li>
                        <li>The buyback request must be raised within 36 months from the date of purchase.</li>
                        <li>The device should not have any critical hardware failure (Motherboard dead, Screen broken).</li>
                    </ul>
                </section>

                <section>
                    <h3 class="text-lg font-bold text-slate-900 mb-3">2. Condition & Deductions</h3>
                    <p class="text-sm text-slate-600 mb-3">The assured price assumes the laptop is in "Good" condition. Deductions may apply for the following:</p>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <span class="font-bold text-slate-800 text-sm block mb-1">Functional Issues</span>
                            <p class="text-xs text-slate-500">Keyboard keys not working, Battery dead (holds 0 charge), Speaker crackling, WiFi issues.</p>
                        </div>
                        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <span class="font-bold text-slate-800 text-sm block mb-1">Physical Damage</span>
                            <p class="text-xs text-slate-500">Cracked screen, Broken hinges, Major dents on body, Missing rubber feet.</p>
                        </div>
                        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
                            <span class="font-bold text-slate-800 text-sm block mb-1">Accessories</span>
                            <p class="text-xs text-slate-500">Missing original charger/adapter will result in a deduction of ₹800 - ₹1500 depending on the model.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 class="text-lg font-bold text-slate-900 mb-3">3. How to Claim</h3>
                    <ol class="list-decimal list-outside ml-5 space-y-2 text-slate-600 text-sm leading-relaxed">
                        <li>Login to your account and go to "My Orders".</li>
                        <li>Select the laptop you wish to sell and click "Claim Buyback".</li>
                        <li>Fill in the self-assessment form regarding the current condition.</li>
                        <li>Our executive will visit for physical verification within 48 hours.</li>
                        <li>Once verified, the amount will be transferred to your bank account instantly.</li>
                    </ol>
                </section>

            </div>

        </div>
    </main>

    <?php include 'includes/footer.php'; ?>

</body>
</html>