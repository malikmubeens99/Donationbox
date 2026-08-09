import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Real Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1Lz7uDui4928S-m1AlTTtPCuBcp-U4Sw",
  authDomain: "donationbox-8e697.firebaseapp.com",
  projectId: "donationbox-8e697",
  storageBucket: "donationbox-8e697.firebasestorage.app",
  messagingSenderId: "130828492156",
  appId: "1:130828492156:web:a3e2fb5ae1b260a04d18f9",
  measurementId: "G-RS2FQ425S0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentRider = null;
let html5QrCode = null;

// Initialize Session on Load (Checks localStorage)
window.addEventListener('DOMContentLoaded', () => {
    const savedRider = localStorage.getItem('wisdom_rider_session');
    
    if (savedRider) {
        currentRider = JSON.parse(savedRider);
        showScannerScreen();
    } else {
        document.getElementById('loginCard').classList.remove('hidden');
    }
});

// 1-Time PIN Login Handler
const riderLoginForm = document.getElementById('riderLoginForm');
if (riderLoginForm) {
    riderLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pinCode = document.getElementById('loginPinCode').value.trim();

        try {
            // Check code in Firestore riders collection
            const q = query(collection(db, "riders"), where("code", "==", pinCode));
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("❌ Ghalat PIN Code! Admin se apna sahi 4-digit PIN confirm karein.");
                return;
            }

            const riderDoc = snap.docs[0];
            const riderData = riderDoc.data();

            currentRider = {
                id: riderDoc.id,
                name: riderData.name,
                code: riderData.code,
                area: riderData.area
            };

            // Save session to mobile storage forever
            localStorage.setItem('wisdom_rider_session', JSON.stringify(currentRider));

            alert(`✅ Welcome ${currentRider.name}! Session initialized.`);
            showScannerScreen();

        } catch (err) {
            alert("Login Error: " + err.message);
        }
    });
}

// Show Camera Scanner Screen after Login
function showScannerScreen() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('scannerArea').classList.remove('hidden');
    
    const badge = document.getElementById('activeRiderBadge');
    badge.innerText = `Rider: ${currentRider.name} (#${currentRider.code})`;
    badge.classList.remove('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');

    startScanner();
}

// Start Camera Stream
function startScanner() {
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 220, height: 220 } }, 
        (decodedText) => {
            html5QrCode.stop().then(() => {
                loadShopDetails(decodedText);
            }).catch(() => loadShopDetails(decodedText));
        }
    ).catch(err => {
        console.error("Camera access error: ", err);
    });
}

// Fetch Shop Details After Scan
async function loadShopDetails(shopId) {
    try {
        const docRef = doc(db, "shops", shopId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('scannedShopId').value = shopId;
            document.getElementById('scannedShopName').innerText = data.name;
            document.getElementById('scannedShopArea').innerText = data.area;
            
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

// Submit Collection Entry Tagged with Rider PIN Code
const submitCollectionForm = document.getElementById('submitCollectionForm');
if (submitCollectionForm) {
    submitCollectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shopId = document.getElementById('scannedShopId').value;
        const shopName = document.getElementById('scannedShopName').innerText;
        const shopArea = document.getElementById('scannedShopArea').innerText;
        const amount = Number(document.getElementById('collectionAmount').value);

        if (!currentRider) {
            alert("Session expired! Please re-login.");
            location.reload();
            return;
        }

        try {
            await addDoc(collection(db, "collections"), {
                shopId: shopId,
                shopName: shopName,
                area: shopArea,
                amount: amount,
                collectorName: currentRider.name,
                riderCode: currentRider.code,
                timestamp: serverTimestamp()
            });

            alert("✅ Collection record successfully submit ho gaya!");
            location.reload();
        } catch (error) {
            alert("Error submitting entry: " + error.message);
        }
    });
}

// Logout Option
window.logoutRider = () => {
    if (confirm("Kya aap logout karna chahte hain? Next time dubara 4-digit PIN daalna pare ga.")) {
        localStorage.removeItem('wisdom_rider_session');
        location.reload();
    }
};
