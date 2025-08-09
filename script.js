// Firebase configuration (replace with your Firebase project config)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Hardcoded list of names for the dropdown
const rowHeaderNames = [
    "Ahsan", "Nasa", "Alif", "Alifah", "Hanin", "Rijal", "Hasna",
    "Fathir", "Tsabita", "Yusuf", "Fafa", "Umar", "Aisyah", "Ridho", "Arza"
];

const signatureCanvas = document.getElementById('signature-canvas');
const signatureCtx = signatureCanvas.getContext('2d');
let isSignatureDrawing = false;

// Populate the name dropdown
function populateNameDropdown(data) {
    const nameSelect = document.getElementById('name');
    nameSelect.innerHTML = '<option value="" disabled selected>Select your name</option>';
    // Only show names that don't have signatures
    rowHeaderNames.forEach((name, index) => {
        if (!data[index] || !data[index][0].image) { // Only add names without signatures
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            nameSelect.appendChild(option);
        }
    });
    // Check if all signatures are collected
    checkFullState(data);
}

// Check if all signatures are present
function checkFullState(data) {
    const allSigned = data.every(row => row[0].image);
    const formStatus = document.getElementById('form-status');
    if (allSigned) {
        formStatus.textContent = 'All signatures have been collected!';
        formStatus.style.color = '#9ae01e';
        document.getElementById('contact-form').style.display = 'none'; // Hide form when full
    } else {
        formStatus.textContent = '';
        document.getElementById('contact-form').style.display = 'block';
    }
}

// Signature Canvas Setup
function setupSignatureCanvas() {
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.strokeStyle = '#333333';
    
    signatureCanvas.addEventListener('mousedown', (e) => {
        isSignatureDrawing = true;
        signatureCtx.beginPath();
        signatureCtx.moveTo(e.offsetX, e.offsetY);
    });
    
    signatureCanvas.addEventListener('mousemove', (e) => {
        if (isSignatureDrawing) {
            signatureCtx.lineTo(e.offsetX, e.offsetY);
            signatureCtx.stroke();
        }
    });
    
    signatureCanvas.addEventListener('mouseup', () => {
        isSignatureDrawing = false;
        signatureCtx.closePath();
    });
    
    signatureCanvas.addEventListener('mouseout', () => {
        isSignatureDrawing = false;
        signatureCtx.closePath();
    });
    
    signatureCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isSignatureDrawing = true;
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        signatureCtx.beginPath();
        signatureCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    
    signatureCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isSignatureDrawing) {
            const touch = e.touches[0];
            const rect = signatureCanvas.getBoundingClientRect();
            signatureCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
            signatureCtx.stroke();
        }
    });
    
    signatureCanvas.addEventListener('touchend', () => {
        isSignatureDrawing = false;
        signatureCtx.closePath();
    });
    
    document.querySelector('.btn-clear').addEventListener('click', () => {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    });
}

// Contact Form Submission
document.getElementById('contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const formStatus = document.getElementById('form-status');
    const submitButton = document.querySelector('.btn-primary');
    submitButton.disabled = true;
    
    try {
        const imageData = signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height).data;
        const isCanvasEmpty = !Array.from(imageData).some(value => value !== 0);
        if (isCanvasEmpty) {
            formStatus.textContent = 'Please draw a signature before submitting.';
            formStatus.style.color = '#ff4d4d';
            submitButton.disabled = false;
            return;
        }
        
        const name = document.getElementById('name').value;
        if (!name) {
            formStatus.textContent = 'Please select a name.';
            formStatus.style.color = '#ff4d4d';
            submitButton.disabled = false;
            return;
        }
        
        const rowIndex = rowHeaderNames.indexOf(name);
        if (rowIndex === -1) {
            formStatus.textContent = 'Selected name not found.';
            formStatus.style.color = '#ff4d4d';
            submitButton.disabled = false;
            return;
        }
        
        // Check existing data in Firebase
        const snapshot = await database.ref('spreadsheetData').once('value');
        let data = snapshot.val() || Array(rowHeaderNames.length).fill().map(() => [{ text: '', image: '' }]);
        
        if (data[rowIndex][0].image) {
            formStatus.textContent = 'A signature already exists for this name.';
            formStatus.style.color = '#ff4d4d';
            submitButton.disabled = false;
            return;
        }
        
        const dataURL = signatureCanvas.toDataURL('image/png', 0.9);
        data[rowIndex][0].image = dataURL;
        
        // Save updated data to Firebase
        await database.ref('spreadsheetData').set(data);
        
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        document.getElementById('name').value = '';
        formStatus.textContent = 'Signature saved successfully!';
        formStatus.style.color = '#9ae01e';
    } catch (error) {
        console.error('Error processing form:', error);
        formStatus.textContent = `Error: ${error.message}`;
        formStatus.style.color = '#ff4d4d';
    } finally {
        submitButton.disabled = false;
    }
});

// Listen for real-time updates from Firebase
database.ref('spreadsheetData').on('value', (snapshot) => {
    const data = snapshot.val() || Array(rowHeaderNames.length).fill().map(() => [{ text: '', image: '' }]);
    populateNameDropdown(data);
});

// Initialize the form
setupSignatureCanvas();
document.getElementById('contact-form').reset();
signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
