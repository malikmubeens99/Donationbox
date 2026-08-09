import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

window.captureCurrentGPS = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById('lat').value = pos.coords.latitude;
        document.getElementById('lng').value = pos.coords.longitude;
        alert("📍 GPS Coordinates Captured!");
    }, () => alert("GPS Permission Denied. Please enter manually."));
};

// Tab Switcher
window.switchTab = (tab) => {
    ['viewDashboard', 'viewAudit', 'viewAnalytics'].forEach(v => document.getElementById(v).classList.add('hidden'));
    if(tab === 'dashboard') document.getElementById('viewDashboard').classList.remove('hidden');
    if(tab === 'audit') document.getElementById('viewAudit').classList.remove('hidden');
    if(tab === 'analytics') document.getElementById('viewAnalytics').classList.remove('hidden');
};

// Add Shop with GPS
const addShopForm = document.getElementById('addShopForm');
if (addShopForm) {
    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "shops"), {
                name: document.getElementById('shopName').value,
                owner: document.getElementById('ownerName').value,
                phone: document.getElementById('ownerPhone').value,
                area: document.getElementById('shopArea').value,
                lat: Number(document.getElementById('lat').value),
                lng: Number(document.getElementById('lng').value),
                createdAt: serverTimestamp()
            });
            alert("✅ Shop & Asset Registered!");
            addShopForm.reset();
        } catch(err) { alert(err.message); }
    });
}

// Realtime Analytics & Office Reconciliation Listener
onSnapshot(query(collection(db, "collections"), orderBy("timestamp", "desc")), snap => {
    let grandTotal = 0;
    let pendingVerify = 0;
    const auditBody = document.getElementById('auditTableBody');
    if(auditBody) auditBody.innerHTML = "";

    snap.forEach(d => {
        const item = d.data();
        grandTotal += Number(item.amount || 0);

        if(item.status === 'PendingVerification') {
            pendingVerify += Number(item.amount || 0);
        }

        if(auditBody) {
            const date = item.timestamp ? new Date(item.timestamp.toDate()).toLocaleDateString('en-PK') : 'N/A';
            auditBody.innerHTML += `
                <tr>
                    <td class="py-3 font-mono">${date}</td>
                    <td class="py-3 font-bold text-white">${item.collectorName} (#${item.riderCode})</td>
                    <td class="py-3 font-black text-amber-400">Rs. ${item.amount}</td>
                    <td class="py-3">${item.shopName}</td>
                    <td class="py-3"><span class="px-2 py-0.5 rounded text-[10px] ${item.status === 'Verified' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}">${item.status || 'Pending'}</span></td>
                    <td class="py-3 text-right">
                        ${item.status !== 'Verified' ? `<button onclick="verifyCashEntry('${d.id}')" class="px-3 py-1 bg-teal-700 text-white rounded text-[10px] font-bold">Approve Cash</button>` : '✓ Done'}
                    </td>
                </tr>
            `;
        }
    });

    document.getElementById('kpiTotalCash').innerText = `Rs. ${grandTotal.toLocaleString()}`;
    document.getElementById('kpiPendingVerify').innerText = `Rs. ${pendingVerify.toLocaleString()}`;
});

window.verifyCashEntry = async (id) => {
    if(confirm("Verify actual physical cash received at office?")) {
        await updateDoc(doc(db, "collections", id), { status: "Verified" });
        alert("✅ Office Verification Complete!");
    }
};
