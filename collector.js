import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize QR Scanner
const html5QrCode = new Html5Qrcode("reader");

function onScanSuccess(decodedText, decodedResult) {
    html5QrCode.stop(); // Stop scanning after successful read
    loadShopDetails(decodedText);
}

html5QrCode.start(
    { facingMode: "environment" }, 
    { fps: 10, qrbox: { width: 250, height: 250 } }, 
    onScanSuccess
);

async function loadShopDetails(shopId) {
    const docRef = doc(db, "shops", shopId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('scannedShopId').value = shopId;
        document.getElementById('scannedShopName').innerText = data.name;
        document.getElementById('scannedShopArea').innerText = data.area;
        document.getElementById('collectionFormCard').classList.remove('d-none');
    } else {
        alert("Ghalat QR Code! Shop database mein nahi mili.");
        location.reload();
    }
}

// Submit Collection
document.getElementById('submitCollectionForm').addEventListener('submit', async (e) => {
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

        alert("Collection Saved Successfully!");
        location.reload();
    } catch (error) {
        alert("Error saving: " + error.message);
    }
});
