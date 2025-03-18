// authModule.js

// DO NOT change original logic; only modify references to shared variables.
async function attemptIREVLogin() {
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    const otp = document.getElementById('otp').value || null;

    try {
        // Save tokens on the global window object
        window.originalAccessToken = await loginIREV(login, password, otp);
        window.accessToken = await getCallbackToken(window.originalAccessToken);
    } catch (error) {
        if (error.message === 'OTP required') {
            window.otpGroup.style.display = 'block';
            document.getElementById('otp').setAttribute('required', 'required');
            window.showErrorMessage('Please enter your OTP code.');
            throw error;
        } else {
            throw error;
        }
    }
}

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

async function getCallbackToken(originalAccessToken) {
    let domain = document.getElementById("domain").value;
    if (domain.includes('//') === true) {
        domain = domain.split("//")[1];
    }
    const url = "https://" + domain + '/api/auth/v1/callback';
    const payload = {
        "domain": domain
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

export { attemptIREVLogin, loginIREV, getCallbackToken };
