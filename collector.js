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
// 1. PIN VERIFICATION & SESSION
// ==========================================

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

        currentRider = snap.docs[0].data();
        
        // Hide Login & Show Camera Scanner
        document.getElementById('loginCard').classList.add('hidden');
        document.getElementById('scannerSection').classList.remove('hidden');
        document.getElementById('riderBadge').innerText = `Rider: ${currentRider.name} (#${currentRider.code})`;

        startCameraScanner();

    } catch (err) {
        alert("Login Error: " + err.message);
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
// 3. INSTANT SHOP DETECTOR (NO GPS)
// ==========================================

async function loadShopForCollection(scannedText) {
    try {
        let shopData = null;
        let shopDocId = null;

        // Step A: Direct Search by Shop Document ID
        const directDocSnap = await getDoc(doc(db, "shops", scannedText));

        if (directDocSnap.exists()) {
            shopData = directDocSnap.data();
            shopDocId = directDocSnap.id;
        } else {
            // Step B: Search Donation Boxes Collection by Box ID (e.g., BOX-XXXXX)
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

        // Populate Form Data
        document.getElementById('scannedShopId').value = shopDocId;
        document.getElementById('shopTitle').innerText = shopData.name;
        document.getElementById('shopSub').innerText = shopData.area;

        // Switch Screen to Entry Form Instantly
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
            alert("Rider Session Expired! Please Re-verify PIN.");
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
