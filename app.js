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

// Initialize Firebase Engine
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global Caching
let globalShopsCache = [];
let globalCollectionsCache = [];

// ==========================================
// 🎨 INTERACTIVE POPUP & TOAST NOTIFICATION SYSTEM
// ==========================================

// Floating Toast Notification
window.showToast = (title, message, type = 'success') => {
    let toast = document.getElementById('customInteractiveToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customInteractiveToast';
        document.body.appendChild(toast);
    }

    const isSuccess = type === 'success';
    const borderCol = isSuccess ? 'border-amber-500' : 'border-rose-500';
    const icon = isSuccess ? '✨' : '⚠️';

    toast.className = `fixed bottom-6 right-6 z-50 flex items-center gap-4 p-4 rounded-2xl bg-turkish-900 border-2 ${borderCol} shadow-2xl transition-all transform translate-y-0 opacity-100 duration-300 max-w-sm`;
    toast.innerHTML = `
        <div class="text-3xl">${icon}</div>
        <div>
            <h4 class="font-extrabold text-xs text-gold-400 uppercase tracking-widest">${title}</h4>
            <p class="text-xs text-gray-200 mt-0.5">${message}</p>
        </div>
    `;

    setTimeout(() => {
        toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-10 opacity-0 pointer-events-none');
    }, 4000);
};

// Interactive QR Sticker Modal Popup
window.showQRModalPopup = (shopName, shopArea, boxId) => {
    let modal = document.getElementById('qrModalPopup');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qrModalPopup';
        modal.className = "fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-turkish-900 border-2 border-gold-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100">
            <div class="flex justify-between items-center mb-4">
                <span class="text-xs text-gold-400 font-extrabold tracking-widest uppercase">✨ Asset Created</span>
                <button onclick="document.getElementById('qrModalPopup').remove()" class="text-gray-400 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <!-- Print Ready Sticker Container -->
            <div id="printableQrSticker" class="bg-white text-gray-900 p-5 rounded-2xl shadow-xl border-4 border-turkish-700 inline-block w-full">
                <p class="text-[9px] font-extrabold tracking-widest text-turkish-700 uppercase mb-1">Wisdom Foundation</p>
                <h3 class="font-black text-base text-gray-900">${shopName}</h3>
                <p class="text-xs text-gray-600 font-semibold mb-2">${shopArea}</p>
                
                <div id="modalQrContainer" class="flex justify-center my-3 p-2 bg-white"></div>
                
                <p class="text-[11px] font-mono font-bold text-gray-600">BOX ID: <span class="text-turkish-700">${boxId}</span></p>
            </div>

            <div class="flex gap-2 mt-5">
                <button onclick="window.print()" class="flex-1 py-3 bg-turkish-700 hover:bg-turkish-600 text-white rounded-xl text-xs font-extrabold transition">🖨️ Print Sticker</button>
                <button onclick="document.getElementById('qrModalPopup').remove()" class="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold">Done</button>
            </div>
        </div>
    `;

    // Safe Dual QR Code Generation
    const qrTarget = document.getElementById("modalQrContainer");
    qrTarget.innerHTML = "";
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrTarget, { text: boxId, width: 150, height: 150 });
    } else {
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(boxId)}`;
        img.className = "mx-auto rounded-lg";
        qrTarget.appendChild(img);
    }
};

// ==========================================
// 📱 GLOBAL NAVIGATION & GPS CAPTURE
// ==========================================

window.switchTab = (tab) => {
    const views = ['viewDashboard', 'viewAudit', 'viewRiders', 'viewAnalytics'];
    views.forEach(v => document.getElementById(v)?.classList.add('hidden'));

    if (tab === 'dashboard') document.getElementById('viewDashboard')?.classList.remove('hidden');
    if (tab === 'audit') document.getElementById('viewAudit')?.classList.remove('hidden');
    if (tab === 'riders') document.getElementById('viewRiders')?.classList.remove('hidden');
    if (tab === 'analytics') {
        document.getElementById('viewAnalytics')?.classList.remove('hidden');
        runAnomalyDetectionEngine();
    }
};

window.captureCurrentGPS = () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                document.getElementById('lat').value = pos.coords.latitude;
                document.getElementById('lng').value = pos.coords.longitude;
                showToast("GPS Locked", "Latitude & Longitude coordinates updated!", "success");
            },
            (err) => showToast("GPS Error", err.message, "error")
        );
    } else {
        showToast("Device Error", "Geolocation is not supported by your browser.", "error");
    }
};

// ==========================================
// 🏪 SHOPS & QR GENERATION ENGINE
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

            await addDoc(collection(db, "donationBoxes"), {
                boxId: boxId,
                shopId: shopId,
                shopName: name,
                status: "Active",
                installedAt: serverTimestamp()
            });

            addShopForm.reset();
            showToast("Success", "Shop & Box Asset saved to cloud!", "success");
            
            // Trigger Interactive QR Code Modal
            showQRModalPopup(name, area, boxId);

        } catch (error) {
            showToast("System Error", error.message, "error");
        }
    });
}

// Live Sync: Shops Directory Table
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
                        <button onclick="showQRModalPopup('${shop.name.replace(/'/g, "\\'")}', '${shop.area.replace(/'/g, "\\'")}', '${boxId}')" class="px-2.5 py-1 bg-turkish-700 hover:bg-turkish-600 text-[10px] text-white rounded-lg border border-turkish-500/30 font-bold transition">
                            View QR Sticker ➔
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
// 🛵 RIDER FLEET & PIN MANAGEMENT
// ==========================================

const addRiderForm = document.getElementById('addRiderForm');
if (addRiderForm) {
    addRiderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('riderName').value;
        const code = document.getElementById('riderCode').value;
        const phone = document.getElementById('riderPhone').value;
        const area = document.getElementById('riderArea').value;

        const qCheck = query(collection(db, "riders"), where("code", "==", code));
        const checkSnap = await getDocs(qCheck);

        if (!checkSnap.empty) {
            showToast("Duplicate Code", "Yeh 4-Digit PIN pehle se kisi doosre rider ka hai!", "error");
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

            showToast("Rider Registered", `Rider ${name} (PIN: #${code}) saved!`, "success");
            addRiderForm.reset();
        } catch (err) {
            showToast("Error", err.message, "error");
        }
    });
}

// Live Sync: Riders Fleet
const ridersListTable = document.getElementById('ridersListTable');
if (ridersListTable) {
    const qRiders = query(collection(db, "riders"), orderBy("createdAt", "desc"));

    onSnapshot(qRiders, (snapshot) => {
        ridersListTable.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const rider = docSnap.data();

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
// 🏦 OFFICE CASH AUDIT & RECONCILIATION
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

    if (document.getElementById('kpiTotalCash')) {
        document.getElementById('kpiTotalCash').innerText = `Rs. ${grandTotalCash.toLocaleString()}`;
    }
    if (document.getElementById('kpiPendingVerify')) {
        document.getElementById('kpiPendingVerify').innerText = `Rs. ${pendingVerificationCash.toLocaleString()}`;
    }
});

window.approveCashCollection = async (docId) => {
    try {
        await updateDoc(doc(db, "collections", docId), {
            status: "Verified",
            verifiedAt: serverTimestamp()
        });
        showToast("Cash Approved", "Physical cash verified & locked in ledger!", "success");
    } catch (err) {
        showToast("Error", err.message, "error");
    }
};

// ==========================================
// 🚨 ANOMALY DETECTION ENGINE
// ==========================================

function runAnomalyDetectionEngine() {
    const anomalyBody = document.getElementById('anomalyTableBody');
    if (!anomalyBody) return;

    anomalyBody.innerHTML = "";
    const now = new Date();
    let inactiveBoxCount = 0;

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
