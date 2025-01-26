const RAPID_API_KEY = 'd66f24736bmsh01ae3cb80607b91p178d4djsn20ae13239fbd';

async function fetchKeywordSuggestions(keyword) {
    try {
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'google-keyword-insight1.p.rapidapi.com',
                'x-rapidapi-key': RAPID_API_KEY
            }
        };

        const url = `https://google-keyword-insight1.p.rapidapi.com/globalkey/?keyword=${encodeURIComponent(keyword)}&lang=en`;
        console.log('Fetching from:', url);

        const response = await fetch(url, options);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            throw new Error('API request failed');
        }

        // The new API returns an array of keyword data
        if (Array.isArray(data)) {
            const keywords = data.map(item => item.keyword || item.text || item);
            return keywords.filter(Boolean); // Remove any undefined or null values
        }

        return [];
    } catch (error) {
        console.error('Detailed error:', error);
        throw new Error(`Failed to fetch suggestions: ${error.message}`);
    }
}

async function searchKeywords() {
    const input = document.getElementById('keywordInput').value.toLowerCase().trim();
    const resultsBody = document.getElementById('resultsBody');
    const copyBtn = document.getElementById('copyButton');
    const downloadBtn = document.getElementById('downloadButton');
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    resultsBody.innerHTML = '<tr><td>Fetching suggestions...</td></tr>';

    if (input.length < 2) {
        alert('Please enter at least 2 characters');
        return;
    }

    try {
        const suggestions = await fetchKeywordSuggestions(input);
        resultsBody.innerHTML = '';

        if (!suggestions.length) {
            resultsBody.innerHTML = '<tr><td colspan="2">No suggestions found.</td></tr>';
            return;
        }

        suggestions.forEach((keyword, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${keyword}</td>
                <td>
                    <input type="checkbox" class="keyword-checkbox" data-index="${index}">
                </td>
            `;
            resultsBody.appendChild(row);
        });

        // Enable buttons if we have results
        copyBtn.disabled = false;
        downloadBtn.disabled = false;

    } catch (error) {
        console.error('Error:', error);
        resultsBody.innerHTML = `<tr><td colspan="2">Error: ${error.message}. Please try again later.</td></tr>`;
    }
}

function getSelectedKeywords() {
    const checkboxes = document.querySelectorAll('.keyword-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.closest('tr').querySelector('td:first-child').textContent);
}

function copyToClipboard() {
    const keywords = getSelectedKeywords();
    if (keywords.length === 0) {
        showNotification('Please select keywords to copy', true);
        return;
    }

    navigator.clipboard.writeText(keywords.join('\n')).then(() => {
        showNotification(`${keywords.length} keywords copied to clipboard!`);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy keywords', true);
    });
}

function downloadCSV() {
    const keywords = getSelectedKeywords();
    if (keywords.length === 0) {
        showNotification('Please select keywords to download', true);
        return;
    }

    const csvContent = 'Keywords\n' + keywords.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'selected_keywords.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showNotification(`${keywords.length} keywords downloaded!`);
}

function handleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.keyword-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
        const row = checkbox.closest('tr');
        if (e.target.checked) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });
}

function handleCheckboxChange(e) {
    const row = e.target.closest('tr');
    if (e.target.checked) {
        row.classList.add('selected');
    } else {
        row.classList.remove('selected');
        document.getElementById('selectAll').checked = false;
    }
}

// Remove existing event listener and add a new one
document.addEventListener('DOMContentLoaded', function() {
    const keywordInput = document.getElementById('keywordInput');
    const searchButton = document.querySelector('button');

    keywordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchKeywords();
        }
    });

    searchButton.addEventListener('click', searchKeywords);
    
    document.getElementById('copyButton').addEventListener('click', copyToClipboard);
    document.getElementById('downloadButton').addEventListener('click', downloadCSV);

    // Add select all functionality
    document.getElementById('selectAll').addEventListener('change', handleSelectAll);

    // Add delegation for checkbox changes
    document.getElementById('resultsBody').addEventListener('change', function(e) {
        if (e.target.matches('.keyword-checkbox')) {
            handleCheckboxChange(e);
        }
    });
});
