const RAPID_API_KEY = 'd66f24736bmsh01ae3cb80607b91p178d4djsn20ae13239fbd';

// Keyword generation helper data
const keywordModifiers = {
    prefixes: [
        'how to', 'what is', 'best', 'top', 'cheap', 'free',
        'professional', 'online', 'easy', 'diy', 'guide to'
    ],
    suffixes: [
        'service', 'tool', 'software', 'guide', 'tutorial', 'tips',
        'review', 'comparison', 'alternative', 'solution', 'course'
    ],
    modifiers: [
        'best', 'top', 'cheap', 'professional', 'online',
        'free', 'easy', 'quick', 'simple', 'ultimate'
    ]
};

async function generateAIKeywords(keyword) {
    try {
        const response = await fetch('https://open-ai21.p.rapidapi.com/getimgurl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-rapidapi-host': 'open-ai21.p.rapidapi.com',
                'x-rapidapi-key': RAPID_API_KEY
            },
            body: new URLSearchParams({
                prompt: `Generate 30 SEO keyword suggestions related to: ${keyword}. 
                        Focus on search intent, long-tail keywords, and user queries. 
                        Return only the keywords, one per line.`
            })
        });

        if (!response.ok) throw new Error('AI API request failed');
        
        const data = await response.json();
        
        // Parse the AI response and extract keywords
        const keywords = data.answer
            .split('\n')
            .map(k => k.trim())
            .filter(k => k && k.length > 2)
            .filter(k => !k.startsWith('-') && !k.startsWith('*'));

        return keywords;
    } catch (error) {
        console.error('AI Keyword Generation Error:', error);
        // Fallback to local generation if AI fails
        return generateLocalSuggestions(keyword);
    }
}

function generateLocalSuggestions(keyword) {
    // Existing local generation logic
    const suggestions = new Set();
    const words = keyword.split(' ');
    
    // Add original keyword
    suggestions.add(keyword);

    // Add prefix variations
    keywordModifiers.prefixes.forEach(prefix => {
        suggestions.add(`${prefix} ${keyword}`);
    });

    // Add suffix variations
    keywordModifiers.suffixes.forEach(suffix => {
        suggestions.add(`${keyword} ${suffix}`);
    });

    // Add modifier variations
    keywordModifiers.modifiers.forEach(modifier => {
        suggestions.add(`${modifier} ${keyword}`);
        suggestions.add(`${keyword} ${modifier}`);
    });

    // Add combinations
    if (words.length > 1) {
        words.forEach((word, index) => {
            const otherWords = [...words];
            otherWords.splice(index, 1);
            suggestions.add(otherWords.join(' '));
            keywordModifiers.modifiers.forEach(modifier => {
                suggestions.add(`${modifier} ${otherWords.join(' ')}`);
            });
        });
    }

    // Add common questions
    const questions = [
        `how to ${keyword}`,
        `what is ${keyword}`,
        `why ${keyword}`,
        `when to ${keyword}`,
        `where to ${keyword}`,
        `which ${keyword}`
    ];
    questions.forEach(q => suggestions.add(q));

    // Filter and sort results
    return Array.from(suggestions)
        .filter(kw => kw.length >= 3 && kw !== keyword)
        .sort((a, b) => a.length - b.length)
        .slice(0, 30);
}

async function fetchKeywordSuggestions(keyword) {
    try {
        // Try AI generation first
        const aiSuggestions = await generateAIKeywords(keyword);
        if (aiSuggestions.length > 0) {
            showNotification('Using AI-powered suggestions', false, true);
            return aiSuggestions;
        }

        // If AI fails, try the original API
        const options = {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'google-keyword-insight1.p.rapidapi.com',
                'x-rapidapi-key': RAPID_API_KEY
            }
        };

        const url = `https://google-keyword-insight1.p.rapidapi.com/globalkey/?keyword=${encodeURIComponent(keyword)}&lang=en`;
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) throw new Error('API request failed');

        if (Array.isArray(data)) {
            return data.map(item => item.keyword || item.text || item)
                      .filter(Boolean);
        }

        throw new Error('Invalid response format');
    } catch (error) {
        console.error('All APIs failed, using local generation:', error);
        return generateLocalSuggestions(keyword);
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

function showNotification(message, isError = false, isAI = false) {
    const notification = document.createElement('div');
    notification.className = 'copy-success';
    notification.style.backgroundColor = isError ? 'var(--error-color)' : 
                                       isAI ? '#10a37f' : 'var(--success-color)';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}
