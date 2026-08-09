import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ==========================================
// 1. AUTO-LOGIN CHECK ON LOAD (LOCALSTORAGE)
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    const savedSession = localStorage.getItem('wisdom_rider_session');
    
    if (savedSession) {
        try {
            currentRider = JSON.parse(savedSession);
            launchRiderScanner();
        } catch (e) {
            localStorage.removeItem('wisdom_rider_session');
        }
    }
});

// Manual Verification (First Time)
window.verifyRiderPin = async () => {
    const pin = document.getElementById('loginPin').value.trim();
    if (!pin) {
        alert("Meharbani karke 4-digit PIN enter karein!");
        return;
    }

    try {
        const q = query(collection(db, "riders"), where("code", "==", pin));
        const snap = await getDocs(q);

        if (snap.empty) {
            alert("❌ Ghalat PIN Code! Admin se apna 4-digit PIN confirm karein.");
            return;
        }

        const riderData = snap.docs[0].data();
        currentRider = {
            id: snap.docs[0].id,
            name: riderData.name,
            code: riderData.code,
            area: riderData.area
        };
        
        // Save Session Permanently to Device
        localStorage.setItem('wisdom_rider_session', JSON.stringify(currentRider));
        
        launchRiderScanner();

    } catch (err) {
        alert("Login Error: " + err.message);
    }
};

// Launch Camera Screen
function launchRiderScanner() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('scannerSection').classList.remove('hidden');
    document.getElementById('riderBadge').innerText = `Rider: ${currentRider.name} (#${currentRider.code})`;
    document.getElementById('logoutBtn')?.classList.remove('hidden');

    startCameraScanner();
}

// Logout Action
window.logoutRider = () => {
    if (confirm("Kya aap logout karna chahte hain? Next time dobara PIN enter karna pare ga.")) {
        localStorage.removeItem('wisdom_rider_session');
        location.reload();
    }
};

// ==========================================
// 2. CAMERA QR SCANNER ENGINE
// ==========================================

function startCameraScanner() {
    const qr = new Html5Qrcode("reader");
    
    qr.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 220 }, 
        scannedText => {
            qr.stop().then(() => {
                loadShopForCollection(scannedText.trim());
            }).catch(() => loadShopForCollection(scannedText.trim()));
        }
    ).catch(err => {
        alert("Camera Access Error: " + err.message);
    });
}

// ==========================================
// 3. INSTANT SHOP DETECTOR
// ==========================================

async function loadShopForCollection(scannedText) {
    try {
        let shopData = null;
        let shopDocId = null;

        // Step A: Search by Shop Document ID
        const directDocSnap = await getDoc(doc(db, "shops", scannedText));

        if (directDocSnap.exists()) {
            shopData = directDocSnap.data();
            shopDocId = directDocSnap.id;
        } else {
            // Step B: Search by Box Asset ID (e.g. BOX-XXXXX)
            const boxQuery = query(collection(db, "donationBoxes"), where("boxId", "==", scannedText));
            const boxSnap = await getDocs(boxQuery);

            if (!boxSnap.empty) {
                const boxInfo = boxSnap.docs[0].data();
                shopDocId = boxInfo.shopId || boxInfo.currentShopId;

                if (shopDocId) {
                    const mappedShopSnap = await getDoc(doc(db, "shops", shopDocId));
                    if (mappedShopSnap.exists()) {
                        shopData = mappedShopSnap.data();
                    }
                }
            }
        }

        if (!shopData) {
            alert(`❌ Ghalat QR Code! (${scannedText}) Database mein nahi mila.`);
            location.reload();
            return;
        }

        // Populate Form
        document.getElementById('scannedShopId').value = shopDocId;
        document.getElementById('shopTitle').innerText = shopData.name;
        document.getElementById('shopSub').innerText = shopData.area;

        // Switch to Entry Form
        document.getElementById('scannerSection').classList.add('hidden');
        document.getElementById('collectionForm').classList.remove('hidden');

    } catch (error) {
        alert("Error loading shop details: " + error.message);
        location.reload();
    }
}

// ==========================================
// 4. COLLECTION SUBMISSION
// ==========================================

const entryFormSubmit = document.getElementById('entryFormSubmit');
if (entryFormSubmit) {
    entryFormSubmit.addEventListener('submit', async e => {
        e.preventDefault();

        const amount = Number(document.getElementById('collectedAmount').value);
        if (!amount || amount <= 0) {
            alert("Sahi Amount Enter Karein!");
            return;
        }

        if (!currentRider) {
            alert("Session Expired! Please Re-verify PIN.");
            localStorage.removeItem('wisdom_rider_session');
            location.reload();
            return;
        }

        try {
            await addDoc(collection(db, "collections"), {
                shopId: document.getElementById('scannedShopId').value,
                shopName: document.getElementById('shopTitle').innerText,
                amount: amount,
                condition: document.getElementById('boxCondition').value,
                collectorName: currentRider.name,
                riderCode: currentRider.code,
                status: "PendingVerification",
                timestamp: serverTimestamp()
            });

            alert("✅ Collection successfully submit ho gayi!");
            location.reload();

        } catch (err) {
            alert("Error submitting collection: " + err.message);
        }
    });
}
