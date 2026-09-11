<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laptop Mitra Footer</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">

    <style>
        :root {
            --footer-bg: #f8f9fa;
            --footer-text: #64748b;
            --footer-heading: #0f172a;
            --brand-color: #2563eb;
            --transition: all 0.3s ease;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 0;
            padding: 0;
        }

        h1, h2, h3, h4, h5, h6 { font-family: 'Outfit', sans-serif; }

        .footer-area {
            background-color: var(--footer-bg);
            padding: 80px 0 25px;
            border-top: 1px solid #e2e8f0;
            position: relative;
        }

        .footer-brand-area img {
            height: 70px;
            width: auto;
            margin-bottom: 25px;
        }

        .footer-brand-area p {
            font-size: 15px;
            color: var(--footer-text);
            margin-bottom: 25px;
            line-height: 1.6;
            max-width: 90%; 
        }

        .social-icons-list {
            display: flex;
            gap: 12px;
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .social-icons-list li a {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            color: #fff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transition: var(--transition);
            border: none;
            font-size: 18px;
            text-decoration: none;
        }

        .ico-facebook { background-color: #1877F2; }
        .ico-instagram { background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%); }
        .ico-linkedin { background-color: #0077B5; }
        .ico-youtube { background-color: #FF0000; }
        .ico-x { background-color: #000000; }
        
        .ico-x svg { width: 16px; height: 16px; fill: #fff; }

        .social-icons-list li a:hover {
            transform: translateY(-5px);
            filter: brightness(1.15);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        }

        .footer-heading {
            font-size: 18px;
            font-weight: 700;
            color: var(--footer-heading);
            margin-bottom: 30px;
        }

        .quick-links ul { list-style: none; padding: 0; margin: 0; }
        .quick-links ul li { margin-bottom: 14px; }
        
        .quick-links ul li a {
            text-decoration: none;
            color: var(--footer-text);
            font-size: 15px;
            font-weight: 500;
            transition: var(--transition);
            display: inline-flex;
            align-items: center;
        }

        .quick-links ul li a i { font-size: 12px; margin-right: 10px; color: #cbd5e1; transition: var(--transition); }
        .quick-links ul li a:hover { color: var(--brand-color); padding-left: 5px; }
        .quick-links ul li a:hover i { color: var(--brand-color); }

        .contact-list { list-style: none; padding: 0; margin: 0; }
        .contact-list li { display: flex; align-items: flex-start; margin-bottom: 24px; }

        .contact-icon-box {
            width: 45px;
            height: 45px;
            background-color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--brand-color);
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            margin-right: 15px;
            flex-shrink: 0;
            transition: var(--transition);
        }

        .contact-list li:hover .contact-icon-box { background-color: var(--brand-color); color: #fff; transform: scale(1.1); }
        .contact-info h6 { font-size: 15px; font-weight: 700; color: var(--footer-heading); margin: 0 0 4px 0; }
        .contact-info p, .contact-info a { font-size: 14px; color: var(--footer-text); margin: 0; line-height: 1.5; text-decoration: none; transition: var(--transition); }
        .contact-info a:hover { color: var(--brand-color); }

        .copyright-area { margin-top: 60px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center; }
        .copyright-text { font-size: 14px; color: #94a3b8; font-weight: 500; }

        .floating-btn {
            position: fixed;
            bottom: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 1000;
            transition: all 0.3s;
            animation: pulse-float 3s infinite;
            text-decoration: none;
        }
        .floating-btn:hover { transform: scale(1.1) translateY(-5px); animation: none; }
        .floating-btn i { font-size: 28px; color: white; }
        
        .btn-whatsapp { right: 30px; background: #25D366; }
        .btn-call { left: 30px; background: #004cff; }

        @keyframes pulse-float {
            0% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
            100% { transform: translateY(0); }
        }

        @media (max-width: 991px) {
            .footer-widget { margin-bottom: 40px; }
            .floating-btn { width: 50px; height: 50px; bottom: 20px; }
            .floating-btn i { font-size: 22px; }
            .btn-whatsapp { right: 20px; }
            .btn-call { left: 20px; }
        }
    </style>
</head>
<body>

<footer class="footer-area">
    <div class="container">
        <div class="row">
            
            <div class="col-lg-4 col-md-6 footer-widget">
                <div class="footer-brand-area">
                    <a href="index.php">
                        <img src="assets/logo-laptop-mitra.png" alt="Laptop Mitra">
                    </a>
                    <p>Premium refurbished laptops and hardware solutions. Partnering with businesses to deliver operational excellence.</p>
                    
                    <ul class="social-icons-list">
                        <li>
                            <a href="https://www.facebook.com/laptopmitra" target="_blank" class="ico-facebook" aria-label="Facebook">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.instagram.com/laptop.mitra/" target="_blank" class="ico-instagram" aria-label="Instagram">
                                <i class="fab fa-instagram"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.linkedin.com/company/laptopmitra/" target="_blank" class="ico-linkedin" aria-label="LinkedIn">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.youtube.com/@LaptopMitra" target="_blank" class="ico-youtube" aria-label="YouTube">
                                <i class="fab fa-youtube"></i>
                            </a>
                        </li>
                        <li>
                            <a href="https://x.com/LaptopMitra" target="_blank" class="ico-x" aria-label="X (Twitter)">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="col-lg-4 col-md-6 footer-widget ps-lg-5">
                <h3 class="footer-heading">Quick Links</h3>
                <div class="quick-links">
                    <ul>
                        <li><a href="index.php"><i class="fa-solid fa-angle-right"></i> Home</a></li>
                        <li><a href="store.php"><i class="fa-solid fa-angle-right"></i> Store</a></li>
                        <li><a href="privacy-policy.php"><i class="fa-solid fa-angle-right"></i> Privacy Policy</a></li>
                        <li><a href="terms-and-condition.php"><i class="fa-solid fa-angle-right"></i> Terms & Conditions</a></li>
                    </ul>
                </div>
            </div>

            <div class="col-lg-4 col-md-12 footer-widget">
                <h3 class="footer-heading">Get In Touch</h3>
                <ul class="contact-list">
                    <li>
                        <div class="contact-icon-box">
                            <i class="fa-solid fa-envelope"></i>
                        </div>
                        <div class="contact-info">
                            <h6>Email Us</h6>
                            <a href="mailto:support@laptopmitra.com">support@LaptopMitra.com</a>
                        </div>
                    </li>
                    <li>
                        <div class="contact-icon-box">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                        <div class="contact-info">
                            <h6>Location</h6>
                            <p>D-232 A, Gali No-1, Rajnagar-2,<br>Palam, New Delhi, India</p>
                        </div>
                    </li>
                    <li>
                        <div class="contact-icon-box">
                            <i class="fa-solid fa-phone"></i>
                        </div>
                        <div class="contact-info">
                            <h6>Call Us</h6>
                            <a href="tel:+91 7701993300">+91 7701993300</a>
                        </div>
                    </li>
                </ul>
            </div>

        </div>

        <div class="row">
    <div class="col-12">
        <div class="copyright-area">
            <p class="copyright-text mb-0">
                &copy; 2026 <strong>LaptopMitra</strong>. All Rights Reserved. 
                Powered by <a href="https://xpertnote.com" target="_blank" style="color: blue; text-decoration: underline;">
                    www.XpertNote.com
                </a>
            </p>
        </div>
    </div>
</div>

    </div>
</footer>

<a href="tel:+917701993300" class="floating-btn btn-call" aria-label="Call Us">
    <i class="fa-solid fa-phone"></i>
</a>

<a href="https://wa.me/917701993300?text=Hello%20Laptop%20Mitra%20Team,%20I%20visited%20your%20website%20and%20I%20am%20interested%20in%20buying%20a%20refurbished%20laptop.%20Please%20assist%20me%20with%20the%20available%20models%20and%20pricing." target="_blank" class="floating-btn btn-whatsapp" aria-label="Chat on WhatsApp">
    <i class="fa-brands fa-whatsapp"></i>
</a>

</body>
</html>