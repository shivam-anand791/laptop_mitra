<style>
    /* --- CSS Styles --- */
    
    /* Variable definitions for easy color changes */
    :root {
        --hd-bg-color: #1a202c; /* Dark Navy Background matching image */
        --hd-text-color: #ffffff;
        --hd-hover-color: #e2e8f0;
        --hd-accent-color: #ffd700; /* Gold for Best Deals emphasis if needed, or white */
        --hd-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Reset for this component */
    .hd-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    .hd-wrapper {
        background-color: var(--hd-bg-color);
        color: var(--hd-text-color);
        font-family: var(--hd-font-family);
        font-weight: 600; /* Semi-bold text */
        width: 100%;
        position: relative;
        z-index: 999; /* Ensure dropdowns sit on top */
    }

    .hd-navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 2rem; /* Horizontal padding matching image */
        height: 60px;
        max-width: 1200px;
        margin: 0 auto;
    }

    /* Left Side Navigation */
    .hd-nav-links {
        display: flex;
        list-style: none;
        gap: 2rem; /* Space between items */
        align-items: center;
    }

    .hd-nav-links li {
        position: relative;
    }

    .hd-nav-links a {
        text-decoration: none;
        color: var(--hd-text-color);
        font-size: 16px;
        transition: color 0.2s ease;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .hd-nav-links a:hover {
        color: #cbd5e0; /* Slight grey on hover */
    }

    /* Dropdown Logic for "More" */
    .hd-dropdown-content {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        background-color: #2d3748;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        border-radius: 4px;
        padding: 10px 0;
        z-index: 1;
    }

    .hd-dropdown-content a {
        padding: 10px 15px;
        display: block;
        font-weight: normal;
    }

    .hd-dropdown-content a:hover {
        background-color: #4a5568;
    }

    /* Show dropdown on hover */
    .hd-dropdown:hover .hd-dropdown-content {
        display: block;
    }
    
    /* Chevron arrow for "More" */
    .hd-chevron::after {
        content: '';
        border: solid white;
        border-width: 0 2px 2px 0;
        display: inline-block;
        padding: 3px;
        transform: rotate(45deg);
        -webkit-transform: rotate(45deg);
        margin-bottom: 2px;
    }

    /* Right Side "Best Deals" */
    .hd-best-deals {
        text-decoration: none;
        color: var(--hd-text-color);
        font-weight: 700;
        letter-spacing: 0.5px;
        transition: transform 0.2s;
    }
    
    .hd-best-deals:hover {
        transform: scale(1.05);
    }

    /* Mobile Hamburger Icon (Hidden on Desktop) */
    .hd-hamburger {
        display: none;
        cursor: pointer;
        font-size: 24px;
    }

    /* --- Responsive Styles (Mobile) --- */
    @media (max-width: 768px) {
        .hd-navbar {
            padding: 0 1rem;
        }

        .hd-hamburger {
            display: block; /* Show hamburger on mobile */
        }

        .hd-nav-links {
            position: absolute;
            top: 60px;
            left: 0;
            width: 100%;
            background-color: var(--hd-bg-color);
            flex-direction: column;
            align-items: flex-start;
            padding: 0;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
            width: 100%;
        }

        .hd-nav-links.active {
            max-height: 500px; /* Open menu height */
            padding-bottom: 20px;
        }

        .hd-nav-links li {
            width: 100%;
            border-top: 1px solid #2d3748;
        }

        .hd-nav-links a {
            padding: 15px 20px;
            width: 100%;
        }

        /* Adjust Dropdown for mobile to be static/indented */
        .hd-dropdown:hover .hd-dropdown-content {
            display: none; /* Disable hover on mobile */
        }
        
        .hd-dropdown-content {
            position: static;
            background-color: #232b38;
            box-shadow: none;
        }
        
        /* Always show "Best Deals" inside the menu or separate? 
           Based on standard UX, we move right items into the menu list on mobile */
        .hd-right-desktop {
            display: none; /* Hide desktop best deals button */
        }
        
        .hd-mobile-only {
            display: block !important;
        }
    }
    
    @media (min-width: 769px) {
        .hd-mobile-only {
            display: none !important;
        }
    }
</style>

<div class="hd-container">
    <div class="hd-wrapper">
        <nav class="hd-navbar">
            
            <div class="hd-hamburger" onclick="toggleHdMenu()">
                &#9776; </div>

            <ul class="hd-nav-links" id="hdNavLinks">
                <li><a href="">Home</a></li>
                <li><a href="store.php">Store</a></li>
                <li><a href="orders.php">My Orders</a></li>
                
                <!--<li class="hd-dropdown">-->
                <!--    <a href="#" class="hd-chevron">More</a>-->
                <!--    <div class="hd-dropdown-content">-->
                <!--        <a href="#">About Us</a>-->
                <!--        <a href="#">Contact</a>-->
                <!--        <a href="#">FAQ</a>-->
                <!--    </div>-->
                <!--</li>-->
                
                <li class="hd-mobile-only"><a href="#" style="color: #ffda79;">Best Deals</a></li>
            </ul>

            <a href="#" class="hd-best-deals hd-right-desktop">Best Deals</a>
        </nav>
    </div>
</div>

<script>
    function toggleHdMenu() {
        const nav = document.getElementById('hdNavLinks');
        nav.classList.toggle('active');
    }
</script>