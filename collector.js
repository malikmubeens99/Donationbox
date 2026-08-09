import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
let riderGPS = { lat: 0, lng: 0 };

// Haversine Geofencing Formula (Distance in Meters)
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
}

window.verifyRiderPin = async () => {
    const pin = document.getElementById('loginPin').value;
    const q = query(collection(db, "riders"), where("code", "==", pin));
    const snap = await getDocs(q);

    if(snap.empty) { alert("❌ Invalid Rider PIN!"); return; }
    
    currentRider = snap.docs[0].data();
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('scannerSection').classList.remove('hidden');
    document.getElementById('riderBadge').innerText = `Rider: ${currentRider.name} (#${currentRider.code})`;

    // Track Rider Current Location
    navigator.geolocation.watchPosition(pos => {
        riderGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    });

    startCameraScanner();
};

function startCameraScanner() {
    const qr = new Html5Qrcode("reader");
    qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, text => {
        qr.stop();
        loadShopForCollection(text);
    });
}

async function loadShopForCollection(shopId) {
    const snap = await getDoc(doc(db, "shops", shopId));
    if(!snap.exists()) { alert("Shop Not Found!"); location.reload(); return; }

    const shop = snap.data();
    document.getElementById('scannedShopId').value = shopId;
    document.getElementById('shopTitle').innerText = shop.name;
    document.getElementById('shopSub').innerText = shop.area;

    // Calculate Geofence Distance
    let distBadge = document.getElementById('gpsDistanceBadge');
    if(shop.lat && shop.lng && riderGPS.lat) {
        const meters = calculateDistanceMeters(riderGPS.lat, riderGPS.lng, shop.lat, shop.lng);
        if(meters <= 100) {
            distBadge.innerHTML = `<span class="text-emerald-400">✅ Location Verified (${meters}m away)</span>`;
        } else {
            distBadge.innerHTML = `<span class="text-rose-400">⚠️ Distance Warning: ${meters}m away from shop</span>`;
        }
    } else {
        distBadge.innerHTML = `<span class="text-amber-400">⚠️ GPS Location Not Fixed</span>`;
    }

    document.getElementById('scannerSection').classList.add('hidden');
    document.getElementById('collectionForm').classList.remove('hidden');
}

document.getElementById('entryFormSubmit').addEventListener('submit', async e => {
    e.preventDefault();
    await addDoc(collection(db, "collections"), {
        shopId: document.getElementById('scannedShopId').value,
        shopName: document.getElementById('shopTitle').innerText,
        amount: Number(document.getElementById('collectedAmount').value),
        condition: document.getElementById('boxCondition').value,
        photoUrl: document.getElementById('photoUrl').value,
        collectorName: currentRider.name,
        riderCode: currentRider.code,
        status: "PendingVerification",
        submittedLat: riderGPS.lat,
        submittedLng: riderGPS.lng,
        timestamp: serverTimestamp()
    });
    alert("✅ Collection Recorded! Proceeding to next shop.");
    location.reload();
});
