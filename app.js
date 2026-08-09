import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
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

let globalShopsCache = [];
let globalCollectionsCache = [];
let selectedShopIds = new Set();

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

    toast.className = `fixed bottom-6 right-6 z-50 flex items-center gap-4 p-4 rounded-2xl bg-turkish-900 border-2 ${borderCol} shadow-2xl transition-all transform translate-y-0 opacity-100 duration-300 max-w-sm`;
    toast.innerHTML = `
        <div class="text-2xl">${isSuccess ? '✨' : '⚠️'}</div>
        <div>
            <h4 class="font-extrabold text-xs text-gold-400 uppercase tracking-widest">${title}</h4>
            <p class="text-xs text-gray-200 mt-0.5">${message}</p>
        </div>
    `;

    setTimeout(() => {
        toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-10 opacity-0 pointer-events-none');
    }, 4000);
};

// 🎯 ACTIVE DARK NAVIGATION STATE MANAGER
window.switchTab = (tab) => {
    const views = ['viewDashboard', 'viewShopsDirectory', 'viewAudit', 'viewRiders', 'viewAnalytics'];
    const navs = {
        'dashboard': 'navDash',
        'shopsDirectory': 'navShops',
        'audit': 'navAudit',
        'riders': 'navRiders',
        'analytics': 'navAnalytics'
    };

    // Hide all views & remove dark active class from all buttons
    views.forEach(v => document.getElementById(v)?.classList.add('hidden'));
    Object.values(navs).forEach(navId => {
        const btn = document.getElementById(navId);
        if (btn) btn.className = "w-full text-left px-4 py-2.5 rounded-xl text-gray-400 hover:bg-turkish-800 hover:text-white text-xs transition";
    });

    // Show active view & set DARK active class
    if (tab === 'dashboard') document.getElementById('viewDashboard')?.classList.remove('hidden');
    if (tab === 'shopsDirectory') document.getElementById('viewShopsDirectory')?.classList.remove('hidden');
    if (tab === 'audit') document.getElementById('viewAudit')?.classList.remove('hidden');
    if (tab === 'riders') document.getElementById('viewRiders')?.classList.remove('hidden');
    if (tab === 'analytics') {
        document.getElementById('viewAnalytics')?.classList.remove('hidden');
        runAnomalyDetectionEngine();
    }

    const activeBtn = document.getElementById(navs[tab]);
    if (activeBtn) activeBtn.className = "w-full text-left px-4 py-2.5 rounded-xl text-white text-xs transition nav-active";

    document.getElementById('mainSidebar')?.classList.add('hidden');
};

// Single QR Modal Popup
window.showQRModalPopup = (shopName, shopArea, boxId) => {
    let modal = document.getElementById('qrModalPopup');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qrModalPopup';
        modal.className = "fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-turkish-900 border-2 border-gold-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <span class="text-xs text-gold-400 font-extrabold tracking-widest uppercase">✨ Asset Sticker</span>
                <button onclick="document.getElementById('qrModalPopup').remove()" class="text-gray-400 hover:text-white text-xl font-bold">&times;</button>
            </div>

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
// 🏪 SHOPS DIRECTORY & BULK QR SELECTION
// ==========================================

const addShopForm = document.getElementById('addShopForm');
if (addShopForm) {
    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('shopName').value;
        const owner = document.getElementById('ownerName').value;
        const phone = document.getElementById('ownerPhone').value;
        const area = document.getElementById('shopArea').value;

        try {
            const docRef = await addDoc(collection(db, "shops"), {
                name: name,
                owner: owner,
                phone: phone,
                area: area,
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
            showToast("Success", "Shop & Box Asset saved!", "success");
            showQRModalPopup(name, area, boxId);

        } catch (error) {
            showToast("System Error", error.message, "error");
        }
    });
}

// Live Shops Directory Listener
const shopsDirectoryBody = document.getElementById('shopsDirectoryBody');
if (shopsDirectoryBody) {
    onSnapshot(query(collection(db, "shops"), orderBy("createdAt", "desc")), (snapshot) => {
        shopsDirectoryBody.innerHTML = "";
        globalShopsCache = [];

        snapshot.forEach((docSnap) => {
            const shop = docSnap.data();
            const id = docSnap.id;
            const boxId = `BOX-${id.slice(0, 5).toUpperCase()}`;
            globalShopsCache.push({ id, boxId, ...shop });

            shopsDirectoryBody.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3 text-center">
                        <input type="checkbox" value="${id}" onchange="toggleShopSelection('${id}', this.checked)" class="shop-select-checkbox accent-gold-500 cursor-pointer" ${selectedShopIds.has(id) ? 'checked' : ''}>
                    </td>
                    <td class="py-3 font-mono text-gold-400 font-bold">
                        ${shop.name}
                        <span class="block text-[10px] text-gray-500 font-normal">ID: ${boxId}</span>
                    </td>
                    <td class="py-3 text-white font-semibold">${shop.owner || 'N/A'}</td>
                    <td class="py-3 font-mono text-gray-400">${shop.phone}</td>
                    <td class="py-3 text-turkish-500 font-medium">${shop.area}</td>
                    <td class="py-3 text-right">
                        <button onclick="showQRModalPopup('${shop.name.replace(/'/g, "\\'")}', '${shop.area.replace(/'/g, "\\'")}', '${boxId}')" class="px-2.5 py-1 bg-turkish-700 hover:bg-turkish-600 text-[10px] text-white rounded-lg font-bold transition">
                            QR Sticker
                        </button>
                    </td>
                </tr>
            `;
        });

        if (document.getElementById('kpiActiveBoxes')) document.getElementById('kpiActiveBoxes').innerText = globalShopsCache.length;
    });
}

// Checkbox Selection Helpers
window.toggleShopSelection = (shopId, isChecked) => {
    if (isChecked) selectedShopIds.add(shopId);
    else selectedShopIds.delete(shopId);
    document.getElementById('selectedQrCount').innerText = selectedShopIds.size;
};

window.toggleSelectAllShops = (masterCheckbox) => {
    const checkboxes = document.querySelectorAll('.shop-select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = masterCheckbox.checked;
        if (masterCheckbox.checked) selectedShopIds.add(cb.value);
        else selectedShopIds.delete(cb.value);
    });
    document.getElementById('selectedQrCount').innerText = selectedShopIds.size;
};

window.filterShopsDirectory = () => {
    const searchVal = document.getElementById('searchShopInput').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#shopsDirectoryBody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchVal) ? '' : 'none';
    });
};

// Open Combined Printable QR Modal
window.openBulkPrintModal = () => {
    if (selectedShopIds.size === 0) {
        showToast("Selection Needed", "Pehle kam az kam ek shop select karein!", "error");
        return;
    }

    const grid = document.getElementById('bulkStickersGrid');
    grid.innerHTML = "";

    selectedShopIds.forEach(id => {
        const shop = globalShopsCache.find(s => s.id === id);
        if (!shop) return;

        const qrId = `bulkQr_${id}`;
        grid.innerHTML += `
            <div class="sticker-card bg-white text-gray-900 p-4 rounded-2xl shadow-md border-2 border-turkish-700 text-center">
                <p class="text-[8px] font-extrabold tracking-widest text-turkish-700 uppercase mb-0.5">Wisdom Foundation</p>
                <h4 class="font-black text-sm text-gray-900 leading-tight">${shop.name}</h4>
                <p class="text-[10px] text-gray-600 font-semibold mb-2">${shop.area}</p>
                <div id="${qrId}" class="flex justify-center my-2 p-1 bg-white"></div>
                <p class="text-[10px] font-mono font-bold text-gray-700">BOX ID: ${shop.boxId}</p>
            </div>
        `;

        setTimeout(() => {
            const target = document.getElementById(qrId);
            if (target) {
                target.innerHTML = "";
                if (typeof QRCode !== 'undefined') {
                    new QRCode(target, { text: shop.boxId, width: 110, height: 110 });
                } else {
                    target.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(shop.boxId)}" class="mx-auto" />`;
                }
            }
        }, 100);
    });

    document.getElementById('bulkPrintModal').classList.remove('hidden');
};

// ==========================================
// 🛵 RIDERS & PER-DAY REPORT ENGINE
// ==========================================

const addRiderForm = document.getElementById('addRiderForm');
if (addRiderForm) {
    addRiderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('riderName').value;
        const code = document.getElementById('riderCode').value;
        const phone = document.getElementById('riderPhone').value;
        const area = document.getElementById('riderArea').value;

        const checkSnap = await getDocs(query(collection(db, "riders"), where("code", "==", code)));
        if (!checkSnap.empty) {
            showToast("Duplicate Code", "PIN pehle se kisi doosre rider ka hai!", "error");
            return;
        }

        try {
            await addDoc(collection(db, "riders"), { name, code, phone, area, createdAt: serverTimestamp() });
            showToast("Rider Saved", `Rider ${name} (PIN: #${code}) registered!`, "success");
            addRiderForm.reset();
        } catch (err) {
            showToast("Error", err.message, "error");
        }
    });
}

const ridersListTable = document.getElementById('ridersListTable');
if (ridersListTable) {
    onSnapshot(query(collection(db, "riders"), orderBy("createdAt", "desc")), (snapshot) => {
        ridersListTable.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const rider = docSnap.data();
            ridersListTable.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3 font-bold text-white flex items-center gap-2">🛵 ${rider.name}</td>
                    <td class="py-3 font-mono font-bold text-gold-400">#${rider.code}</td>
                    <td class="py-3 text-gray-300 text-xs">${rider.area}</td>
                    <td class="py-3 text-right">
                        <button onclick="openRiderDailyReport('${rider.code}', '${rider.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-gold-500/20 hover:bg-gold-500 text-gold-400 hover:text-turkish-900 border border-gold-500/40 rounded-lg font-bold text-[10px] transition">
                            View Report 📊
                        </button>
                    </td>
                </tr>
            `;
        });
    });
}

// 📊 RIDER PER-DAY COLLECTION & BOXES REPORT MODAL
window.openRiderDailyReport = (riderCode, riderName) => {
    document.getElementById('modalRiderName').innerText = riderName;
    document.getElementById('modalRiderMeta').innerText = `Rider PIN: #${riderCode}`;

    const body = document.getElementById('modalRiderDailyBreakdownBody');
    body.innerHTML = "";

    // Group collections by Date (YYYY-MM-DD)
    const dailyMap = {};
    let grandTotalCash = 0;
    let grandTotalBoxes = 0;

    globalCollectionsCache.forEach(item => {
        if (item.riderCode == riderCode) {
            const amt = Number(item.amount || 0);
            grandTotalCash += amt;
            grandTotalBoxes += 1;

            const dateKey = item.timestamp ? new Date(item.timestamp.toDate()).toLocaleDateString('en-PK') : 'Unknown Date';

            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = { boxesOpened: 0, totalAmount: 0 };
            }

            dailyMap[dateKey].boxesOpened += 1;
            dailyMap[dateKey].totalAmount += amt;
        }
    });

    document.getElementById('modalRiderGrandTotal').innerText = `Rs. ${grandTotalCash.toLocaleString()}`;
    document.getElementById('modalRiderGrandBoxes').innerText = `${grandTotalBoxes} Boxes`;

    const sortedDates = Object.keys(dailyMap);
    if (sortedDates.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-gray-500">Is rider ki abhi koi collection history nahi hai.</td></tr>`;
    } else {
        sortedDates.forEach(date => {
            const stats = dailyMap[date];
            body.innerHTML += `
                <tr class="hover:bg-turkish-800/30 transition">
                    <td class="py-2.5 font-mono text-gray-200">${date}</td>
                    <td class="py-2.5 text-center font-bold text-turkish-500">${stats.boxesOpened} Boxes Opened</td>
                    <td class="py-2.5 text-right font-black text-gold-400">Rs. ${stats.totalAmount.toLocaleString()}</td>
                </tr>
            `;
        });
    }

    document.getElementById('riderReportModal').classList.remove('hidden');
};

// ==========================================
// 🏦 OFFICE CASH AUDIT & INACTIVE ENGINE
// ==========================================

const auditTableBody = document.getElementById('auditTableBody');
const dashLiveFeedBody = document.getElementById('dashLiveFeedBody');

onSnapshot(query(collection(db, "collections"), orderBy("timestamp", "desc")), (snapshot) => {
    let grandTotal = 0;
    let pendingCash = 0;
    
    globalCollectionsCache = [];
    if (auditTableBody) auditTableBody.innerHTML = "";
    if (dashLiveFeedBody) dashLiveFeedBody.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const docId = docSnap.id;
        const amount = Number(item.amount || 0);

        grandTotal += amount;
        if (item.status === 'PendingVerification') pendingCash += amount;
        globalCollectionsCache.push({ id: docId, ...item });

        const dateStr = item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : 'Just now';

        // Populate Dashboard Feed
        if (dashLiveFeedBody && dashLiveFeedBody.children.length < 10) {
            dashLiveFeedBody.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-2 font-mono text-gray-400">${dateStr}</td>
                    <td class="py-2 font-bold text-white">${item.shopName}</td>
                    <td class="py-2 text-turkish-500">${item.collectorName}</td>
                    <td class="py-2 text-right font-black text-gold-400">Rs. ${amount.toLocaleString()}</td>
                </tr>
            `;
        }

        // Populate Audit Table
        if (auditTableBody) {
            auditTableBody.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3 font-mono text-gray-400">${dateStr}</td>
                    <td class="py-3 font-bold text-white">${item.collectorName} <span class="text-gold-400 font-mono">(#${item.riderCode || 'N/A'})</span></td>
                    <td class="py-3 font-black text-gold-400">Rs. ${amount.toLocaleString()}</td>
                    <td class="py-3 text-gray-300">${item.shopName}</td>
                    <td class="py-3">${item.status === 'Verified' ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">Verified</span>' : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">Pending</span>'}</td>
                    <td class="py-3 text-right">
                        ${item.status !== 'Verified' ? `<button onclick="approveCashCollection('${docId}')" class="px-3 py-1 bg-turkish-700 hover:bg-turkish-600 text-white rounded-lg text-[10px] font-bold">Approve</button>` : '<span class="text-emerald-400 font-bold text-[11px]">✓ Verified</span>'}
                    </td>
                </tr>
            `;
        }
    });

    if (document.getElementById('kpiTotalCash')) document.getElementById('kpiTotalCash').innerText = `Rs. ${grandTotal.toLocaleString()}`;
    if (document.getElementById('kpiPendingVerify')) document.getElementById('kpiPendingVerify').innerText = `Rs. ${pendingCash.toLocaleString()}`;
});

window.approveCashCollection = async (docId) => {
    try {
        await updateDoc(doc(db, "collections", docId), { status: "Verified", verifiedAt: serverTimestamp() });
        showToast("Cash Approved", "Physical cash verified!", "success");
    } catch (err) {
        showToast("Error", err.message, "error");
    }
};

function runAnomalyDetectionEngine() {
    const anomalyBody = document.getElementById('anomalyTableBody');
    if (!anomalyBody) return;

    anomalyBody.innerHTML = "";
    const now = new Date();
    let inactiveCount = 0;

    const shopVisitMap = {};
    globalCollectionsCache.forEach(col => {
        if (!col.shopId) return;
        const colDate = col.timestamp ? col.timestamp.toDate() : new Date();
        if (!shopVisitMap[col.shopId] || colDate > shopVisitMap[col.shopId].date) {
            shopVisitMap[col.shopId] = { date: colDate, riderName: col.collectorName, riderCode: col.riderCode || 'N/A' };
        }
    });

    globalShopsCache.forEach(shop => {
        const lastVisit = shopVisitMap[shop.id];
        let daysInactive = 999;
        let lastVisitText = "Never Visited";
        let lastRiderText = "None";

        if (lastVisit) {
            daysInactive = Math.floor(Math.abs(now - lastVisit.date) / (1000 * 60 * 60 * 24));
            lastVisitText = lastVisit.date.toLocaleDateString('en-PK');
            lastRiderText = `${lastVisit.riderName} (#${lastVisit.riderCode})`;
        }

        if (daysInactive >= 30) {
            inactiveCount++;
            anomalyBody.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition">
                    <td class="py-3"><p class="font-bold text-white">${shop.name}</p><p class="text-[10px] text-turkish-500">${shop.area}</p></td>
                    <td class="py-3 font-mono text-gray-300 text-[11px]">${lastVisitText}</td>
                    <td class="py-3 font-bold text-rose-400">${daysInactive === 999 ? 'No Visits' : daysInactive + ' Days'}</td>
                    <td class="py-3 text-gray-400 text-xs">${lastRiderText}</td>
                    <td class="py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">Inactive</span></td>
                </tr>
            `;
        }
    });

    if (inactiveCount === 0) {
        anomalyBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-emerald-400 font-bold">🎉 All donation boxes have been visited within the last 30 days!</td></tr>`;
    }
    if (document.getElementById('kpiInactiveShops')) {
        document.getElementById('kpiInactiveShops').innerText = inactiveCount;
    }
}
