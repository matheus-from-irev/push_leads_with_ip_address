// csvModule.js

// Original code – DO NOT CHANGE ANY EXISTING LINES
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
        "aff_sub5": "Pushed by CSV tool"
    };

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": authToken
    };

    let domain = document.getElementById("domain").value;
    if (domain.includes('//') != true) {
        domain = 'https://' + domain;
    }

    const url = domain + '/api/affiliates/v2/leads';

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

// Export the CSV processing functions
export { handleCSVUpload, updateCountryWithIP, fetchCountryIPs, processLeads, postLead };
