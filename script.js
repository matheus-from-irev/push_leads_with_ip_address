document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('multi-step-form');
    const formSteps = Array.from(document.querySelectorAll('.form-step'));
    const btnNext = document.querySelectorAll('.btn-next');
    const btnPrev = document.querySelectorAll('.btn-prev');
    const progressbar = document.getElementById('progressbar').querySelectorAll('li');
    const resultDiv = document.getElementById('result');
    const otpGroup = document.getElementById('otp_group');
    const codeGroup = document.getElementById('code_group');
    const darkModeToggle = document.getElementById('darkModeToggle');
    let currentStep = 0;
    let accessToken = '';
    let originalAccessToken = ''; // Store the original accessToken
    let restrictedAccessData = {}; // Store the data from restricted area access
    let sectionValue = ''; // To store the section value needed for the second request

    // Variables for the CSV Upload and Results Steps
    const affiliateSelect = document.getElementById('affiliateSelect');
    const fileInput = document.getElementById('csvFileInput');
    const uploadButton = document.getElementById('uploadButton');
    const resultsDisplay = document.getElementById('resultsDisplay');
    const exportButton = document.getElementById('exportButton');
    let resultsData = []; // To store the results for display in Step 4

    // Dark Mode Toggle Functionality
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode', darkModeToggle.checked);
    });

    // Handle Next Button Clicks
    btnNext.forEach((button) => {
        button.addEventListener('click', async (event) => {
            if (validateForm()) {
                try {
                    if (currentStep === 0) {
                        // Step 1: Login to IREV
                        await attemptIREVLogin();
                        proceedToNextStep();
                    } else if (currentStep === 1) {
                        // Step 2: Access Restricted Area
                        await attemptRestrictedAccess();
                        proceedToNextStep();
                    } else if (currentStep === 2) {
                        // Step 3: CSV Upload and Process Leads
                        await handleCSVUpload();
                        // Proceed to the Results step
                        proceedToNextStep();
                    }
                } catch (error) {
                    showErrorMessage(`Attention: ${error.message}`);
                }
            }
        });
    });

    // Handle Previous Button Clicks
    btnPrev.forEach((button) => {
        button.addEventListener('click', () => {
            formSteps[currentStep].classList.remove('form-step-active');
            progressbar[currentStep].classList.remove('active');
            currentStep--;
            formSteps[currentStep].classList.add('form-step-active');
            progressbar[currentStep].classList.add('active');
            resultDiv.innerHTML = ''; // Clear any previous messages
        });
    });

    // Form Validation
    function validateForm() {
        const inputs = formSteps[currentStep].querySelectorAll('input[required], select[required]');
        for (let input of inputs) {
            if (!input.checkValidity()) {
                input.reportValidity();
                return false;
            }
        }
        return true;
    }

    // Attempt to Login to IREV
    async function attemptIREVLogin() {
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;
        const otp = document.getElementById('otp').value || null;

        try {
            originalAccessToken = await loginIREV(login, password, otp);

            // After obtaining the original accessToken, get the new token via callback API
            accessToken = await getCallbackToken(originalAccessToken);

        } catch (error) {
            if (error.message === 'OTP required') {
                otpGroup.style.display = 'block';
                document.getElementById('otp').setAttribute('required', 'required');
                showErrorMessage('Please enter your OTP code.');
                throw error;
            } else {
                throw error;
            }
        }
    }

    // Login to IREV Function
    async function loginIREV(login, password, otp) {
        const payload = {
            login: login,
            password: password,
        };

        if (otp) {
            payload.token_2fa = otp;
        }

        const headers = {
            'Accept': 'application/json',
            'Authorization': 'Bearer None',
            'Content-Type': 'application/json'
        };

        const response = await fetch('https://id.irev.com/master/backend/crm/api/v1/auth/login', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.data && data.data.access_token) {
            return data.data.access_token;
        } else if (data.error && data.error.otp) {
            throw new Error('OTP required');
        } else {
            throw new Error('Login failed. Please check your credentials.');
        }
    }

    // Get Callback Token Function
    async function getCallbackToken(originalAccessToken) {
        const url = 'https://demo-ldlt.irev.com/api/auth/v1/callback';
        const payload = {
            "domain": "demo-ldlt.irev.com"
        };
        const headers = {
            'Authorization': `Bearer ${originalAccessToken}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.data && data.data.token) {
            return data.data.token;
        } else {
            throw new Error('Failed to retrieve callback token.');
        }
    }

    // Attempt to Access Restricted Area
    async function attemptRestrictedAccess() {
        const code = document.getElementById('code').value || null;

        try {
            if (!code) {
                // First attempt: Request the confirmation code
                await requestConfirmationCode();
                codeGroup.style.display = 'block';
                document.getElementById('code').setAttribute('required', 'required');
                showErrorMessage('Please enter the code sent to your Telegram.');
                throw new Error('Code required');
            } else {
                // Second attempt: Verify the code
                await verifyConfirmationCode(code);
            }
        } catch (error) {
            throw error;
        }
    }

    // Request Confirmation Code Function
    async function requestConfirmationCode() {
        const url = 'https://demo-ldlt.irev.com/api/crm/v1/commands/process';
        const payload = {
            "action": "OTP\\RequestCode",
            "arguments": {
                "actionType": "request"
            }
        };
        const headers = {
            'client-id': '195',
            'content-type': 'application/json',
            'authorization': `Bearer ${accessToken}`
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.data && data.data.error === 'The confirmation code was sent.') {
            // Extract the 'section' value from the response if needed
            if (data.data.section) {
                sectionValue = data.data.section;
            } else {
                // Provide a default section value if not returned
                sectionValue = 'Default section value';
            }
        } else {
            throw new Error('Failed to request confirmation code.');
        }
    }

    // Verify Confirmation Code Function
    async function verifyConfirmationCode(code) {
        const url = 'https://demo-ldlt.irev.com/api/crm/v1/commands/process';
        const payload = {
            "action": "OTP\\RequestCode",
            "arguments": {
                "actionType": "verify",
                "code": code,
                "section": sectionValue
            }
        };
        const headers = {
            'client-id': '195',
            'content-type': 'application/json',
            'authorization': `Bearer ${accessToken}`
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.data && data.data.isUnsecured) {
            // Store the restricted access data
            restrictedAccessData = data.data;

            // Optionally, display success message or proceed to next steps
            showSuccessMessage('Access to restricted area granted.');

        } else {
            throw new Error('Verification failed. Please check the code and try again.');
        }
    }

    // Proceed to Next Step
    function proceedToNextStep() {
        formSteps[currentStep].classList.remove('form-step-active');
        progressbar[currentStep].classList.remove('active');
        currentStep++;
        formSteps[currentStep].classList.add('form-step-active');
        progressbar[currentStep].classList.add('active');
        resultDiv.innerHTML = ''; // Clear any previous messages

        // If we're entering the CSV Upload step, fetch affiliates
        if (currentStep === 2) {
            fetchAffiliates();
        }

        // If we're entering the Results step, display the results
        if (currentStep === 3) {
            displayResults();
        }
    }

    // Show Error Message
    function showErrorMessage(message) {
        resultDiv.innerHTML = `<p class="error">${message}</p>`;
    }

    // Show Success Message
    function showSuccessMessage(message) {
        resultDiv.innerHTML = `<p class="success">${message}</p>`;
    }

    // Function to fetch affiliates and populate the dropdown
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
            "Authorization": `Bearer ${accessToken}`
        };

        fetch('https://demo-ldlt.irev.com/api/crm/v1/table/data', {
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

    // Function to populate the affiliate dropdown
    function populateAffiliateDropdown(affiliateRows) {
        if (!Array.isArray(affiliateRows) || affiliateRows.length === 0) {
            showErrorMessage('No affiliates found.');
            return;
        }
        affiliateSelect.innerHTML = ''; // Clear existing options
        affiliateRows.forEach(row => {
            const option = document.createElement('option');
            option.value = row['token']; // Use token as the value
            option.text = row['name'];   // Display affiliate name
            affiliateSelect.add(option);
        });
    }

// Function to handle CSV upload and processing
async function handleCSVUpload() {
    const file = fileInput.files[0];
    const selectedAffiliateToken = affiliateSelect.value;

    if (!selectedAffiliateToken) {
        showErrorMessage('Please select an affiliate.');
        return;
    }

    if (!file) {
        showErrorMessage('Please select a CSV file.');
        return;
    }

    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                const leads = results.data;

                try {
                    // Step 1: Update "Country" column with IP addresses
                    await updateCountryWithIP(leads);

                    // Step 2: Process the leads after the country update
                    await processLeads(leads, selectedAffiliateToken);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            },
            error: function(error) {
                reject(new Error('Error parsing CSV file: ' + error.message));
            }
        });
    });
}

async function updateCountryWithIP(leads) {
    const countryMap = {};

    // Step 1: Group leads by country
    leads.forEach(row => {
        if (!countryMap[row.Country]) {
            countryMap[row.Country] = [];
        }
        countryMap[row.Country].push(row);
    });

    // Step 2: Fetch IPs for each country
    const countryIpMap = await fetchCountryIPs(Object.keys(countryMap));
    console.log("countryIpMap: ", countryIpMap)
    // Step 3: Assign IPs to each lead based on country
    for (const [country, rows] of Object.entries(countryMap)) {
        const ipList = countryIpMap[country] || [];
        console.log("ipList: ", ipList)
        rows.forEach((row, index) => {
            row.UserIp = ipList[index] ? ipList[index].address : 'N/A';
        });
    }
}

async function fetchCountryIPs(countries) {
    const countryIpMap = {};
    const ipStatusList = document.getElementById('ip-status-list');
    ipStatusList.innerHTML = ''; // Clear previous status messages

    for (const country of countries) {
        // Add a list item for the current country
        const listItem = document.createElement('li');
        listItem.id = `ip-status-${country}`;
        listItem.innerHTML = `Collecting IP addresses for: ${country} <span class="loader"></span>`;
        ipStatusList.appendChild(listItem);

        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://vps3.lucas.inf.br/ipcountry/iplist.php?country=${country}`)}`);
            if (response.ok) {
                const data = await response.json();
                const ipList = JSON.parse(data.contents);

                if (Array.isArray(ipList) && ipList.length > 1) {
                    countryIpMap[country] = ipList[1];
                    // Update the status to success
                    listItem.innerHTML = `Collecting IP addresses for: ${country} ✅`;
                } else {
                    countryIpMap[country] = [];
                    listItem.innerHTML = `Collecting IP addresses for: ${country} ❌ (Empty List)`;
                }
            } else {
                console.error(`HTTP error fetching IP list for country ${country}:`, response.status);
                countryIpMap[country] = [];
                // Update the status to error
                listItem.innerHTML = `Collecting IP addresses for: ${country} ❌ (HTTP Error ${response.status})`;
            }
        } catch (error) {
            console.error(`Error fetching IP list for country ${country}:`, error);
            countryIpMap[country] = [];
            // Update the status to error
            listItem.innerHTML = `Collecting IP addresses for: ${country} ❌ (${error.message})`;
        }
    }

    return countryIpMap;
}

function processLeads(leads, authToken) {
    const totalLeads = leads.length;
    let processedLeads = 0;
    resultsData = []; // Clear previous results
    const leadStatusList = document.getElementById('lead-status-list');
    leadStatusList.innerHTML = ''; // Clear previous status

    return new Promise((resolve) => {
        leads.forEach((lead, index) => {
            // Add a list item for the current lead
            const listItem = document.createElement('li');
            listItem.id = `lead-status-${index}`;
            listItem.innerHTML = `Pushing lead (${lead.FirstName}, ${lead.LastName}, ${index + 1} of ${totalLeads}) <span class="loader"></span>`;
            leadStatusList.appendChild(listItem);

            postLead(lead, authToken)
                .then(response => {
                    processedLeads++;
                    resultsData.push({
                        index: index + 1,
                        status: 'Success',
                        message: 'Processed successfully.',
                        data: response
                    });
                    // Update status to success
                    listItem.innerHTML = `Pushing lead (${lead.FirstName}, ${lead.LastName}, ${index + 1} of ${totalLeads}) ✅`;
                    if (processedLeads === totalLeads) {
                        resolve();
                    }
                })
                .catch(error => {
                    processedLeads++;
                    resultsData.push({
                        index: index + 1,
                        status: 'Error',
                        message: error.message,
                        data: null
                    });
                    // Update status to error
                    listItem.innerHTML = `Pushing lead (${lead.FirstName}, ${lead.LastName}, ${index + 1} of ${totalLeads}) ❌ (${error.message})`;
                    if (processedLeads === totalLeads) {
                        resolve();
                    }
                });
        });
    });
}

    // Function to post a lead
    function postLead(lead, authToken) {
        const ip = lead['UserIp'];
        const country_code = lead['Country'];
        const password = lead['Password'];
        const prefix = lead['Prefix'];
        const phone = lead['Phone'];
        const first_name = lead['FirstName'];
        const last_name = lead['LastName'];
        const email = lead['Email'];
        const language = lead['Language'];
        const offer_id = lead['Offer ID'];
        const affiliate_id = '2'; // Default value

        const payload = {
            "ip": ip,
            "country_code": country_code,
            "password": password,
            "phone": "+" + prefix + phone,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "language": language,
            "offer_id": offer_id,
            "affiliate_id": affiliate_id,
            "aff_sub5": "test"
        };

        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": authToken
        };

        const url = 'https://demo-ldlt.irev.com/api/affiliates/v2/leads';

        return fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(async response => {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Status: ${response.status} / Response: ${errorText}`);
            }
            return response.json();
        });
    }

// Function to display results in Step 4
function displayResults() {
    const resultsDisplay = document.getElementById('resultsDisplay');
    const tableWrapper = resultsDisplay.querySelector('.table-wrapper'); // Get the table-wrapper div
    tableWrapper.innerHTML = ''; // Clear previous results

    if (resultsData.length === 0) {
        tableWrapper.innerHTML = '<p>No results to display.</p>';
        return;
    }

    // Sort the resultsData based on the lead index
    resultsData.sort((a, b) => a.index - b.index);

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

    resultsData.forEach(result => {
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
    tableWrapper.appendChild(table); // Append the table to the table-wrapper
}
});
