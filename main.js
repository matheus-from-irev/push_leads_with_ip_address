// main.js
import { attemptIREVLogin } from './modules/auth.js';
import { attemptRestrictedAccess } from './modules/restricted.js';
import { handleCSVUpload } from './modules/csv.js';
import { 
  validateForm, 
  proceedToNextStep, 
  showErrorMessage, 
  showSuccessMessage, 
  fetchAffiliates, 
  populateAffiliateDropdown, 
  displayResults 
} from './modules/ui.js';

// Expose UI functions globally so other modules can call them via window.
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('multi-step-form');
    // Assign shared variables to the global window object.
    window.formSteps = Array.from(document.querySelectorAll('.form-step'));
    const btnNext = document.querySelectorAll('.btn-next');
    const btnPrev = document.querySelectorAll('.btn-prev');
    window.progressbar = document.getElementById('progressbar').querySelectorAll('li');
    window.resultDiv = document.getElementById('result');
    window.otpGroup = document.getElementById('otp_group');
    window.codeGroup = document.getElementById('code_group');
    const darkModeToggle = document.getElementById('darkModeToggle');
    window.currentStep = 0;
    window.accessToken = '';
    window.originalAccessToken = ''; // Store the original accessToken
    window.restrictedAccessData = {}; // Store the data from restricted area access
    window.sectionValue = ''; // To store the section value needed for the second request

    // Variables for the CSV Upload and Results Steps
    window.affiliateSelect = document.getElementById('affiliateSelect');
    window.fileInput = document.getElementById('csvFileInput');
    const uploadButton = document.getElementById('uploadButton');
    window.resultsDisplay = document.getElementById('resultsDisplay');
    const exportButton = document.getElementById('exportButton');
    window.resultsData = []; // To store the results for display in Step 4

    // Dark Mode Toggle Functionality
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode', darkModeToggle.checked);
    });

    // Handle Next Button Clicks
    btnNext.forEach((button) => {
        button.addEventListener('click', async (event) => {
            if (validateForm()) {
                try {
                    if (window.currentStep === 0) {
                        // Step 1: Login to IREV
                        await attemptIREVLogin();
                        proceedToNextStep();
                    } else if (window.currentStep === 1) {
                        // Step 2: Access Restricted Area
                        await attemptRestrictedAccess();
                        proceedToNextStep();
                    } else if (window.currentStep === 2) {
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
            window.formSteps[window.currentStep].classList.remove('form-step-active');
            window.progressbar[window.currentStep].classList.remove('active');
            window.currentStep--;
            window.formSteps[window.currentStep].classList.add('form-step-active');
            window.progressbar[window.currentStep].classList.add('active');
            window.resultDiv.innerHTML = '';
        });
    });
});
