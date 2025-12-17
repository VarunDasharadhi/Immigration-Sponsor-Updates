async function loadDashboard() {
    const API_URL = "https://europe-west1-gen-lang-client-0461004021.cloudfunctions.net/getImmigrationData";
    
    // SECURE PLACEHOLDER: GitHub Actions will replace this during deploy
    const AUTH_KEY = "__API_KEY__"; 

    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': AUTH_KEY
            }
        });

        if (!response.ok) throw new Error(`Auth failed: ${response.status}`);

        const result = await response.json();
        renderUpdates(result.data);
    } catch (error) {
        console.error("Dashboard Error:", error);
        document.getElementById('loading').innerHTML = "⚠️ Error loading data. Ensure your API Key is set in GitHub Secrets.";
    }
}

function renderUpdates(updates) {
    const container = document.getElementById('data-list');
    document.getElementById('loading').style.display = 'none';
    
    updates.forEach(item => {
        const div = document.createElement('div');
        div.className = 'update-card';
        div.innerHTML = `
            <div class="date">${item.date || 'Recent'}</div>
            <div class="description">${item.summary || item.description || JSON.stringify(item)}</div>
        `;
        container.appendChild(div);
    });
}

window.onload = loadDashboard;