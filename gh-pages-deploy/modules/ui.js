// uiModule.js

function validateForm() {
    // Ensure window.formSteps exists before using it.
    if (!window.formSteps || window.formSteps.length === 0) {
        console.error('window.formSteps is not defined or empty.');
        return false;
    }
    const inputs = window.formSteps[window.currentStep].querySelectorAll('input[required], select[required]');
    for (let input of inputs) {
        if (!input.checkValidity()) {
            input.reportValidity();
            return false;
        }
    }
    return true;
}

function proceedToNextStep() {
    window.formSteps[window.currentStep].classList.remove('form-step-active');
    window.progressbar[window.currentStep].classList.remove('active');
    window.currentStep++;
    window.formSteps[window.currentStep].classList.add('form-step-active');
    window.progressbar[window.currentStep].classList.add('active');
    window.resultDiv.innerHTML = '';

    // When entering the CSV Upload step, fetch affiliates.
    if (window.currentStep === 2) {
        fetchAffiliates();
    }
    // When entering the Results step, display the results.
    if (window.currentStep === 3) {
        displayResults();
    }
}

function showErrorMessage(message) {
    window.resultDiv.innerHTML = `<p class="error">${message}</p>`;
}

function showSuccessMessage(message) {
    window.resultDiv.innerHTML = `<p class="success">${message}</p>`;
}

function fetchAffiliates() {
    const body = {
        "table": "AffiliatesApiTokensTable",
        "page": 1,
        "limit": 100,
        "filters": { "isActive": [true] },
        "order_values": {},
        "scope_values": {}
    };

    const headers = {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "client-id": "195",
        "Authorization": `Bearer ${window.accessToken}`
    };
    let domain = document.getElementById("domain").value;
    if (domain.includes('//') !== true) {
        domain = 'https://' + domain;
    }
    fetch(domain + '/api/crm/v1/table/data', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    })
    .then(async response => {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.rows) {
            populateAffiliateDropdown(data.rows);
        } else {
            showErrorMessage('Error fetching affiliates: Invalid response from server.');
        }
    })
    .catch(error => {
        showErrorMessage('Error fetching affiliates: ' + error);
    });
}

function populateAffiliateDropdown(affiliateRows) {
    if (!Array.isArray(affiliateRows) || affiliateRows.length === 0) {
        showErrorMessage('No affiliates found.');
        return;
    }
    window.affiliateSelect.innerHTML = '';
    affiliateRows.forEach(row => {
        const option = document.createElement('option');
        option.value = row['token'];
        option.text = row['name'];
        window.affiliateSelect.add(option);
    });
}

function displayResults() {
    const resultsDisplay = window.resultsDisplay;
    const tableWrapper = resultsDisplay.querySelector('.table-wrapper');
    tableWrapper.innerHTML = '';

    if (window.resultsData.length === 0) {
        tableWrapper.innerHTML = '<p>No results to display.</p>';
        return;
    }

    window.resultsData.sort((a, b) => a.index - b.index);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    ['Lead', 'Status', 'Message'].forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    window.resultsData.forEach(result => {
        const row = document.createElement('tr');
        row.className = result.status === 'Success' ? 'success-row' : 'error-row';

        const cellIndex = document.createElement('td');
        cellIndex.textContent = result.index;
        row.appendChild(cellIndex);

        const cellStatus = document.createElement('td');
        cellStatus.textContent = result.status;
        row.appendChild(cellStatus);

        const cellMessage = document.createElement('td');
        cellMessage.textContent = result.message;
        row.appendChild(cellMessage);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
}

export { validateForm, proceedToNextStep, showErrorMessage, showSuccessMessage, fetchAffiliates, populateAffiliateDropdown, displayResults };
