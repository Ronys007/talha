<footer class="bg-primary text-light text-center mt-auto">
    <div class="container">
        <div class="row justify-content-center mt-3">
            <div class="col-auto">
                <p>
                    &copy; 2024 All Rights Reserved |
                    <a class="text-light" style="text-decoration:none;" href="https://digitizersolutions.com">Digitizer
                        Solutions</a>
                </p>
            </div>
        </div>
    </div>
</footer>

<!-- Custom JavaScript -->
<script>
    // Navigation Highlighting (Vanilla JS)
    document.addEventListener('DOMContentLoaded', function() {
        const currentUrl = window.location.href;
        const homeBtn = document.getElementById('home-btn');
        const billsBtn = document.getElementById('bills-btn');
        const dropBtn = document.getElementById('drop-btn');

        if (homeBtn && billsBtn && dropBtn) {
            if (currentUrl.includes('/billing')) {
                billsBtn.classList.add('active-btn', 'text-light');
                homeBtn.classList.remove('active-btn', 'text-dark');
                dropBtn.classList.remove('active-btn', 'text-dark');
            } else if ((currentUrl.includes('/profile'))) {
                homeBtn.classList.remove('active-btn', 'text-dark');
                billsBtn.classList.remove('active-btn', 'text-dark');
                dropBtn.classList.add('active-btn', 'text-light');
            } else {
                dropBtn.classList.remove('active-btn', 'text-dark');
                homeBtn.classList.add('active-btn', 'text-light');
                billsBtn.classList.remove('active-btn', 'text-dark');
            }
        }
    });

    // jQuery Logic (Search & Alerts)
    $(function() {
        console.log('Global scripts loaded');

        // Global Search Functionality
        $(document).on('keyup input search', '#search', function(e) {
            var value = $(this).val().toLowerCase().trim();

            // Target all table rows
            $('table tbody tr').each(function() {
                var row = $(this);

                // Always skip "No data" rows or rows marked to ignore
                if (row.hasClass('no-search') || row.text().includes('No bills found') || row
                    .text().includes('No items found')) {
                    return;
                }

                // Show/hide based on match
                var text = row.text().toLowerCase();
                row.toggle(text.indexOf(value) > -1);
            });
        });

        // Auto-close alert messages
        setTimeout(function() {
            $(".alert").alert('close');
        }, 3000);
    });

    // Logout Function
    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            const logoutForm = document.getElementById('logout-form');
            if (logoutForm) {
                logoutForm.submit();
            }
        }
    }
</script>

</body>

</html>
