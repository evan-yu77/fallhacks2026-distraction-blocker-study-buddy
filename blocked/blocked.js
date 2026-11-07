document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeBtn');
    
    closeBtn.addEventListener('click', () => {
        // Attempts to go back to the previous safe page
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // If they opened the blocked site in a new tab, close the tab entirely
            window.close();
        }
    });
});

