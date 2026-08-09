import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    where, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Real Firebase Project Configuration (donationbox-8e697)
const firebaseConfig = {
  apiKey: "AIzaSyD1Lz7uDui4928S-m1AlTTtPCuBcp-U4Sw",
  authDomain: "donationbox-8e697.firebaseapp.com",
  projectId: "donationbox-8e697",
  storageBucket: "donationbox-8e697.firebasestorage.app",
  messagingSenderId: "130828492156",
  appId: "1:130828492156:web:a3e2fb5ae1b260a04d18f9",
  measurementId: "G-RS2FQ425S0"
};

// Initialize Firebase & Firestore Engine
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global State Caching for Analytics
let globalShopsCache = [];
let globalCollectionsCache = [];

// ==========================================
// 1. GLOBAL NAVIGATION & HELPER FUNCTIONS
// ==========================================

// Tab Switcher Function
window.switchTab = (tab) => {
    const views = ['viewDashboard', 'viewAudit', 'viewRiders', 'viewAnalytics'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    if (tab === 'dashboard') document.getElementById('viewDashboard')?.classList.remove('hidden');
    if (tab === 'audit') document.getElementById('viewAudit')?.classList.remove('hidden');
    if (tab === 'riders') document.getElementById('viewRiders')?.classList.remove('hidden');
    if (tab === 'analytics') {
        document.getElementById('viewAnalytics')?.classList.remove('hidden');
        runAnomalyDetectionEngine();
    }
};

// Device Current GPS Capture
window.captureCurrentGPS = () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                document.getElementById('lat').value = pos.coords.latitude;
                document.getElementById('lng').value = pos.coords.longitude;
                alert("📍 Current GPS Coordinates Successfully Captured!");
            },
            (err) => alert("GPS Access Denied/Error: " + err.message)
        );
    } else {
        alert("GPS Location service is not supported by your browser.");
    }
};

// ==========================================
// 2. SHOPS & DONATION BOX ASSET MANAGEMENT
// ==========================================

const addShopForm = document.getElementById('addShopForm');
if (addShopForm) {
    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('shopName').value;
        const owner = document.getElementById('ownerName').value;
        const phone = document.getElementById('ownerPhone').value;
        const area = document.getElementById('shopArea').value;
        const lat = Number(document.getElementById('lat').value || 0);
        const lng = Number(document.getElementById('lng').value || 0);

        try {
            // Save Shop Document
            const docRef = await addDoc(collection(db, "shops"), {
                name: name,
                owner: owner,
                phone: phone,
                area: area,
                lat: lat,
                lng: lng,
                createdAt: serverTimestamp()
            });

            const shopId = docRef.id;
            const boxId = `BOX-${shopId.slice(0, 5).toUpperCase()}`;

            // Save Box Asset Document
            await addDoc(collection(db, "donationBoxes"), {
                boxId: boxId,
                shopId: shopId,
                shopName: name,
                status: "Active",
                installedAt: serverTimestamp()
            });

            alert(`✅ Shop Registered Successfully!\nAssigned Box ID: ${boxId}`);
            addShopForm.reset();

        } catch (error) {
            alert("Error adding shop: " + error.message);
        }
    });
}

// Live Sync: Shops Directory
const shopsTableBody = document.getElementById('shopsTableBody');
if (shopsTableBody) {
    const qShops = query(collection(db, "shops"), orderBy("createdAt", "desc"));
    
    onSnapshot(qShops, (snapshot) => {
        shopsTableBody.innerHTML = "";
        globalShopsCache = [];

        snapshot.forEach((docSnap) => {
            const shop = docSnap.data();
            const id = docSnap.id;
            const boxId = `BOX-${id.slice(0, 5).toUpperCase()}`;
            
            globalShopsCache.push({ id, boxId, ...shop });

            shopsTableBody.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3 font-mono text-gold-400 font-bold">
                        ${shop.name}
                        <span class="block text-[10px] text-gray-500 font-normal">ID: ${id} | ${boxId}</span>
                    </td>
                    <td class="py-3">
                        <p class="text-white font-semibold">${shop.owner || 'N/A'}</p>
                        <p class="text-gray-400 font-mono text-[11px]">${shop.phone}</p>
                    </td>
                    <td class="py-3 text-turkish-500 font-medium">${shop.area}</td>
                    <td class="py-3 text-right">
                        <button onclick="inspectShopAsset('${id}')" class="px-2.5 py-1 bg-turkish-700/80 hover:bg-turkish-600 text-[10px] text-white rounded-lg border border-turkish-500/30 font-bold transition">
                            Inspect & QR ➔
                        </button>
                    </td>
                </tr>
            `;
        });

        if (document.getElementById('kpiActiveBoxes')) {
            document.getElementById('kpiActiveBoxes').innerText = globalShopsCache.length;
        }
    });
}

// ==========================================
// 3. RIDER FLEET & ROUTE MANAGEMENT
// ==========================================

const addRiderForm = document.getElementById('addRiderForm');
if (addRiderForm) {
    addRiderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('riderName').value;
        const code = document.getElementById('riderCode').value;
        const phone = document.getElementById('riderPhone').value;
        const area = document.getElementById('riderArea').value;

        // Check PIN uniqueness
        const qCheck = query(collection(db, "riders"), where("code", "==", code));
        const checkSnap = await getDocs(qCheck);

        if (!checkSnap.empty) {
            alert("❌ Error: Yeh 4-digit PIN code pehle se kisi doosre rider ko allot ho chuka hai!");
            return;
        }

        try {
            await addDoc(collection(db, "riders"), {
                name: name,
                code: code,
                phone: phone,
                area: area,
                createdAt: serverTimestamp()
            });

            alert(`✅ Rider (${name}) successfully registered with PIN: #${code}`);
            addRiderForm.reset();
        } catch (err) {
            alert("Error registering rider: " + err.message);
        }
    });
}

// Live Sync: Riders Table
const ridersListTable = document.getElementById('ridersListTable');
if (ridersListTable) {
    const qRiders = query(collection(db, "riders"), orderBy("createdAt", "desc"));

    onSnapshot(qRiders, (snapshot) => {
        ridersListTable.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const rider = docSnap.data();
            const id = docSnap.id;

            ridersListTable.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3 font-bold text-white flex items-center gap-2">
                        <span>🛵</span> ${rider.name}
                    </td>
                    <td class="py-3 font-mono font-bold text-gold-400">#${rider.code}</td>
                    <td class="py-3 text-turkish-500 font-mono">${rider.phone}</td>
                    <td class="py-3 text-gray-300">${rider.area}</td>
                </tr>
            `;
        });
    });
}

// ==========================================
// 4. LIVE COLLECTIONS & OFFICE CASH AUDIT
// ==========================================

const auditTableBody = document.getElementById('auditTableBody');
const qCollections = query(collection(db, "collections"), orderBy("timestamp", "desc"));

onSnapshot(qCollections, (snapshot) => {
    let grandTotalCash = 0;
    let pendingVerificationCash = 0;
    
    globalCollectionsCache = [];
    if (auditTableBody) auditTableBody.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const docId = docSnap.id;
        const amount = Number(item.amount || 0);

        grandTotalCash += amount;
        if (item.status === 'PendingVerification') {
            pendingVerificationCash += amount;
        }

        globalCollectionsCache.push({ id: docId, ...item });

        if (auditTableBody) {
            const dateStr = item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : 'Just now';
            const statusBadge = item.status === 'Verified' 
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">Verified</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">Pending Office</span>`;

            auditTableBody.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3 font-mono text-gray-400">${dateStr}</td>
                    <td class="py-3 font-bold text-white">${item.collectorName} <span class="text-gold-400 font-mono text-[11px]">(#${item.riderCode || 'N/A'})</span></td>
                    <td class="py-3 font-black text-gold-400">Rs. ${amount.toLocaleString()}</td>
                    <td class="py-3 font-medium text-gray-300">${item.shopName}</td>
                    <td class="py-3">${statusBadge}</td>
                    <td class="py-3 text-right">
                        ${item.status !== 'Verified' 
                            ? `<button onclick="approveCashCollection('${docId}')" class="px-3 py-1 bg-turkish-700 hover:bg-turkish-600 text-white rounded-lg text-[10px] font-bold transition">Approve Cash</button>` 
                            : '<span class="text-emerald-400 font-bold text-[11px]">✓ Verified</span>'}
                    </td>
                </tr>
            `;
        }
    });

    // Update Top KPIs
    if (document.getElementById('kpiTotalCash')) {
        document.getElementById('kpiTotalCash').innerText = `Rs. ${grandTotalCash.toLocaleString()}`;
    }
    if (document.getElementById('kpiPendingVerify')) {
        document.getElementById('kpiPendingVerify').innerText = `Rs. ${pendingVerificationCash.toLocaleString()}`;
    }
});

// Cash Approval Action by Office Auditor
window.approveCashCollection = async (docId) => {
    if (confirm("Kya aap confirm karte hain ke is collection ka physical cash office mein receive ho gaya hai?")) {
        try {
            await updateDoc(doc(db, "collections", docId), {
                status: "Verified",
                verifiedAt: serverTimestamp()
            });
            alert("✅ Office Cash Verified Successfully!");
        } catch (err) {
            alert("Error verifying collection: " + err.message);
        }
    }
};

// ==========================================
// 5. ANOMALY & INACTIVE BOXES AUDIT ENGINE
// ==========================================

function runAnomalyDetectionEngine() {
    const anomalyBody = document.getElementById('anomalyTableBody');
    if (!anomalyBody) return;

    anomalyBody.innerHTML = "";
    const now = new Date();
    let inactiveBoxCount = 0;

    // Map latest visit date to each shop ID
    const shopVisitMap = {};
    globalCollectionsCache.forEach(col => {
        if (!col.shopId) return;
        const colDate = col.timestamp ? col.timestamp.toDate() : new Date();

        if (!shopVisitMap[col.shopId] || colDate > shopVisitMap[col.shopId].date) {
            shopVisitMap[col.shopId] = {
                date: colDate,
                riderName: col.collectorName,
                riderCode: col.riderCode || 'N/A'
            };
        }
    });

    globalShopsCache.forEach(shop => {
        const lastVisit = shopVisitMap[shop.id];
        let daysInactive = 999;
        let lastVisitDateText = "Never Visited";
        let lastRiderText = "None";

        if (lastVisit) {
            const diffTime = Math.abs(now - lastVisit.date);
            daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            lastVisitDateText = lastVisit.date.toLocaleDateString('en-PK');
            lastRiderText = `${lastVisit.riderName} (#${lastVisit.riderCode})`;
        }

        // Highlight shops with no visits in >= 30 days
        if (daysInactive >= 30) {
            inactiveBoxCount++;

            const badge = daysInactive > 60 
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">Critical (${daysInactive} Days)</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">Overdue (${daysInactive} Days)</span>`;

            anomalyBody.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3">
                        <p class="font-bold text-white">${shop.name}</p>
                        <p class="text-[10px] text-turkish-500">${shop.area}</p>
                    </td>
                    <td class="py-3 font-mono text-gray-300 text-[11px]">${lastVisitDateText}</td>
                    <td class="py-3 font-bold text-rose-400">${daysInactive === 999 ? 'No Visits' : daysInactive + ' Days'}</td>
                    <td class="py-3 text-gray-400 text-xs">${lastRiderText}</td>
                    <td class="py-3">${badge}</td>
                </tr>
            `;
        }
    });

    if (inactiveBoxCount === 0) {
        anomalyBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-emerald-400 font-bold">🎉 All active donation boxes have been visited within the last 30 days!</td></tr>`;
    }

    if (document.getElementById('kpiInactiveShops')) {
        document.getElementById('kpiInactiveShops').innerText = inactiveBoxCount;
    }
}

// Shop Inspection Helper
window.inspectShopAsset = (shopId) => {
    const shop = globalShopsCache.find(s => s.id === shopId);
    if (shop) {
        alert(`🏪 SHOP DETAILS:\nName: ${shop.name}\nOwner: ${shop.owner}\nPhone: ${shop.phone}\nArea: ${shop.area}\nBox ID: ${shop.boxId}`);
    }
};
