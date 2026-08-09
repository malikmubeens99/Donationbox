import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Aap ki Real Firebase Configuration (donationbox-8e697)
const firebaseConfig = {
  apiKey: "AIzaSyD1Lz7uDui4928S-m1AlTTtPCuBcp-U4Sw",
  authDomain: "donationbox-8e697.firebaseapp.com",
  projectId: "donationbox-8e697",
  storageBucket: "donationbox-8e697.firebasestorage.app",
  messagingSenderId: "130828492156",
  appId: "1:130828492156:web:a3e2fb5ae1b260a04d18f9",
  measurementId: "G-RS2FQ425S0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Camera QR Scanner Initialization
const html5QrCode = new Html5Qrcode("reader");

function onScanSuccess(decodedText) {
    html5QrCode.stop().then(() => {
        loadShopDetails(decodedText);
    }).catch(err => {
        loadShopDetails(decodedText);
    });
}

// Start Camera Stream
html5QrCode.start(
    { facingMode: "environment" }, 
    { fps: 10, qrbox: { width: 220, height: 220 } }, 
    onScanSuccess
).catch(err => {
    console.error("Camera access error: ", err);
});

// Fetch Shop Details After QR Code Scan
async function loadShopDetails(shopId) {
    try {
        const docRef = doc(db, "shops", shopId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('scannedShopId').value = shopId;
            document.getElementById('scannedShopName').innerText = data.name;
            document.getElementById('scannedShopArea').innerText = data.area;
            
            // Switch UI: Hide Scanner, Show Collection Form
            document.getElementById('scannerArea').classList.add('hidden');
            document.getElementById('collectionFormCard').classList.remove('hidden');
        } else {
            alert("Ghalat QR Code! Ye shop database mein nahi mili.");
            location.reload();
        }
    } catch (error) {
        alert("Error loading shop data: " + error.message);
        location.reload();
    }
}

// Submit Collection Entry
const submitCollectionForm = document.getElementById('submitCollectionForm');
if (submitCollectionForm) {
    submitCollectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shopId = document.getElementById('scannedShopId').value;
        const shopName = document.getElementById('scannedShopName').innerText;
        const shopArea = document.getElementById('scannedShopArea').innerText;
        const amount = Number(document.getElementById('collectionAmount').value);
        const collectorName = document.getElementById('collectorName').value;

        try {
            await addDoc(collection(db, "collections"), {
                shopId: shopId,
                shopName: shopName,
                area: shopArea,
                amount: amount,
                collectorName: collectorName,
                timestamp: serverTimestamp()
            });

            alert("✅ Collection record successfully submit ho gaya!");
            location.reload();
        } catch (error) {
            alert("Error submitting entry: " + error.message);
        }
    });
}
