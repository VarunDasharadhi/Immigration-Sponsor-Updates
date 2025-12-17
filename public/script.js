async function loadDashboard() {
    const API_URL = "https://europe-west1-gen-lang-client-0461004021.cloudfunctions.net/getImmigrationData";
    
    // GitHub Actions will replace this string
    const AUTH_KEY = "__API_KEY__"; 

    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': AUTH_KEY // Use the variable AUTH_KEY here
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Auth failed (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        // result.data contains the array from Firestore
        renderUpdates(result.data || []);
    } catch (error) {
        console.error("Dashboard Error:", error);
        document.getElementById('loading').innerHTML = `⚠️ Error loading data: ${error.message}`;
    }
}

function renderUpdates(updates) {
    const container = document.getElementById('data-list');
    if (!container) return;
    
    document.getElementById('loading').style.display = 'none';
    container.innerHTML = ''; // Clear existing content
    
    updates.forEach(item => {
        const div = document.createElement('div');
        div.className = 'update-card';
        div.innerHTML = `
            <div class="date">${item.date || 'Recent Update'}</div>
            <div class="description">${item.summary || item.description || 'Details coming soon...'}</div>
        `;
        container.appendChild(div);
    });
}

window.onload = loadDashboard;