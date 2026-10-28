<style>
    /* 1. LAYOUT FIX: Footer ko bottom par chipkane ke liye magic code */
    html, body {
        height: 100%;
        margin: 0;
        padding: 0;
    }

    body {
        display: flex;
        flex-direction: column;
        min-height: 100vh; /* Screen ki puri height lega */
    }

    /* Ye content area grow karega aur footer ko niche push karega */
    .wishlist-container {
        flex: 1; 
    }

    /* 2. PROFESSIONAL FOOTER DESIGN */
    footer {
        background-color: #0f172a; /* Dark Navy Blue (Professional Look) */
        color: #e2e8f0; /* Light Text */
        width: 100%;
        margin-top: auto; /* Extra safety to keep it at bottom */
        box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1); /* Upar ki taraf halka shadow */
    }

    .footer-bottom {
        max-width: 1200px;
        margin: 0 auto;
        padding: 25px 20px;
        text-align: center;
        border-top: 1px solid rgba(255, 255, 255, 0.1); /* Bahut halka border separator */
    }

    .footer-bottom p {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 500;
        letter-spacing: 0.8px;
        opacity: 0.9;
    }
    
    /* Copyright icon color styling */
    .footer-bottom p span {
        color: #6366f1; /* Indigo color for the date/name highlight */
        font-weight: 700;
    }
</style>

<footer>
    <div class="footer-bottom">
         <p class="copyright-text mb-0">
                &copy; 2026 <strong>LaptopMitra</strong>. All Rights Reserved. 
                Powered by <a href="https://xpertnote.com" target="_blank" style="color: #d7d5ff; text-decoration: underline;">
                    www.XpertNote.com
                </a>
            </p>
    </div>
</footer>

</body>
</html>