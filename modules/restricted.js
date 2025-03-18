// restrictedModule.js

async function attemptRestrictedAccess() {
    const code = document.getElementById('code').value || null;

    try {
        if (!code) {
            await requestConfirmationCode();
            window.codeGroup.style.display = 'block';
            document.getElementById('code').setAttribute('required', 'required');
            window.showErrorMessage('Please enter the code sent to your Telegram.');
            throw new Error('Code required');
        } else {
            await verifyConfirmationCode(code);
        }
    } catch (error) {
        throw error;
    }
}

async function requestConfirmationCode() {
    let domain = document.getElementById("domain").value;
    if (domain.includes('//') !== true) {
        domain = 'https://' + domain;
    }
    const url = domain + '/api/crm/v1/commands/process';
    const payload = {
        "action": "OTP\\RequestCode",
        "arguments": {
            "actionType": "request"
        }
    };
    const headers = {
        'client-id': '195',
        'content-type': 'application/json',
        'authorization': `Bearer ${window.accessToken}`
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.data && data.data.error === 'The confirmation code was sent.') {
        if (data.data.section) {
            window.sectionValue = data.data.section;
        } else {
            window.sectionValue = 'Default section value';
        }
    } else {
        throw new Error('Failed to request confirmation code.');
    }
}

async function verifyConfirmationCode(code) {
    let domain = document.getElementById("domain").value;
    if (domain.includes('//') !== true) {
        domain = 'https://' + domain;
    }
    const url = domain + '/api/crm/v1/commands/process';
    const payload = {
        "action": "OTP\\RequestCode",
        "arguments": {
            "actionType": "verify",
            "code": code,
            "section": window.sectionValue
        }
    };
    const headers = {
        'client-id': '195',
        'content-type': 'application/json',
        'authorization': `Bearer ${window.accessToken}`
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.data && data.data.isUnsecured) {
        window.restrictedAccessData = data.data;
        window.showSuccessMessage('Access to restricted area granted.');
    } else {
        throw new Error('Verification failed. Please check the code and try again.');
    }
}

export { attemptRestrictedAccess, requestConfirmationCode, verifyConfirmationCode };
