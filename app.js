import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, where, getDocs, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentModalShopId = null;
let currentModalRiderId = null;

// Tab Switcher
window.switchTab = (tab) => {
    const shopsView = document.getElementById('tabShopsView');
    const ridersView = document.getElementById('tabRidersView');
    const navShops = document.getElementById('navDashboard');
    const navRiders = document.getElementById('navRiders');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubTitle = document.getElementById('pageSubTitle');

    if (tab === 'dashboard') {
        shopsView.classList.remove('hidden');
        ridersView.classList.add('hidden');
        navShops.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-turkish-700 text-white font-semibold shadow-md border border-turkish-500/30 transition";
        navRiders.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-turkish-800 hover:text-white transition";
        pageTitle.innerText = "Donation Box Tracking";
        pageSubTitle.innerText = "Real-time shop collection & QR management system";
    } else {
        shopsView.classList.add('hidden');
        ridersView.classList.remove('hidden');
        navRiders.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-turkish-700 text-white font-semibold shadow-md border border-turkish-500/30 transition";
        navShops.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-turkish-800 hover:text-white transition";
        pageTitle.innerText = "Rider Fleet Management";
        pageSubTitle.innerText = "Track rider performance, daily collections, and PIN codes";
    }
};

// 1. Add Shop & Generate QR
const addShopForm = document.getElementById('addShopForm');
if (addShopForm) {
    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shopName = document.getElementById('shopName').value;
        const ownerName = document.getElementById('ownerName').value;
        const ownerPhone = document.getElementById('ownerPhone').value;
        const shopArea = document.getElementById('shopArea').value;

        try {
            const docRef = await addDoc(collection(db, "shops"), {
                name: shopName,
                owner: ownerName,
                phone: ownerPhone,
                area: shopArea,
                createdAt: serverTimestamp()
            });

            const shopId = docRef.id;

            document.getElementById('qrShopTitle').innerText = shopName;
            document.getElementById('qrShopArea').innerText = shopArea;
            document.getElementById('qrShopId').innerText = shopId;
            
            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = "";

            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, { text: shopId, width: 160, height: 160 });
            } else {
                const img = document.createElement('img');
                img.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${shopId}`;
                img.className = "mx-auto";
                qrContainer.appendChild(img);
            }

            document.getElementById('qrPreviewWrapper').classList.remove('hidden');
            addShopForm.reset();

        } catch (error) {
            alert("Error adding shop: " + error.message);
        }
    });
}

// 2. Display All Registered Shops List
const shopsListTable = document.getElementById('shopsListTable');
if (shopsListTable) {
    const qShops = query(collection(db, "shops"), orderBy("createdAt", "desc"));
    
    onSnapshot(qShops, (snapshot) => {
        shopsListTable.innerHTML = "";
        let shopCount = 0;

        snapshot.forEach((docSnap) => {
            shopCount++;
            const shop = docSnap.data();
            const id = docSnap.id;

            shopsListTable.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition cursor-pointer" onclick="openShopDetails('${id}')">
                    <td class="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span class="text-xs text-gold-400">🏪</span> ${shop.name}
                    </td>
                    <td class="py-3 px-3 text-xs text-gray-300">${shop.owner || 'N/A'}</td>
                    <td class="py-3 px-3 text-xs text-turkish-500">${shop.phone}</td>
                    <td class="py-3 px-3 text-xs text-gray-400">${shop.area}</td>
                    <td class="py-3 px-3 text-right">
                        <button class="px-3 py-1 bg-turkish-700/60 hover:bg-turkish-600 text-xs text-white rounded-lg border border-turkish-500/30">
                            Details & QR ➔
                        </button>
                    </td>
                </tr>
            `;
        });

        if (document.getElementById('statTotalShops')) {
            document.getElementById('statTotalShops').innerText = shopCount;
        }
    });
}

// 3. Live Collection Feed (Shows Rider Code)
const collectionLogs = document.getElementById('collectionLogs');
if (collectionLogs) {
    const qCollections = query(collection(db, "collections"), orderBy("timestamp", "desc"));
    
    onSnapshot(qCollections, (snapshot) => {
        collectionLogs.innerHTML = "";
        let totalAmount = 0;
        let count = 0;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            totalAmount += Number(data.amount || 0);
            count++;

            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : 'Just now';
            const riderBadge = data.riderCode ? `${data.collectorName} (#${data.riderCode})` : data.collectorName;

            collectionLogs.innerHTML += `
                <tr class="hover:bg-turkish-800/30 transition">
                    <td class="py-3 px-3 text-xs text-gray-400">${date}</td>
                    <td class="py-3 px-3 font-bold text-white">${data.shopName}</td>
                    <td class="py-3 px-3 text-xs text-turkish-500">${data.area}</td>
                    <td class="py-3 px-3 font-black text-amber-400 text-right">Rs. ${data.amount}</td>
                    <td class="py-3 px-3 text-xs text-gray-300 text-right">${riderBadge}</td>
                </tr>
            `;
        });

        if (document.getElementById('statTotalAmount')) {
            document.getElementById('statTotalAmount').innerText = `Rs. ${totalAmount.toLocaleString()}`;
        }
        if (document.getElementById('statTotalVisits')) {
            document.getElementById('statTotalVisits').innerText = count;
        }
    });
}

// 4. ADD RIDER WITH 4-DIGIT PIN CODE
const addRiderForm = document.getElementById('addRiderForm');
if (addRiderForm) {
    addRiderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('riderName').value;
        const code = document.getElementById('riderCode').value;
        const phone = document.getElementById('riderPhone').value;
        const area = document.getElementById('riderArea').value;

        // Check if code is unique
        const qCodeCheck = query(collection(db, "riders"), where("code", "==", code));
        const codeSnap = await getDocs(qCodeCheck);
        if(!codeSnap.empty) {
            alert("Error: Yeh 4-digit code pehle se kisi doosre rider ko allot ho chuka hai! Koi naya code rakhein.");
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

            alert(`✅ Rider (${name}) successfully registered with Code: ${code}!`);
            addRiderForm.reset();
        } catch (err) {
            alert("Error registering rider: " + err.message);
        }
    });
}

const ridersListTable = document.getElementById('ridersListTable');
if (ridersListTable) {
    const qRiders = query(collection(db, "riders"), orderBy("createdAt", "desc"));
    
    onSnapshot(qRiders, (snapshot) => {
        ridersListTable.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const rider = docSnap.data();
            const id = docSnap.id;

            ridersListTable.innerHTML += `
                <tr class="hover:bg-turkish-800/40 transition cursor-pointer" onclick="openRiderDetails('${id}', '${rider.code}')">
                    <td class="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span class="text-xs text-gold-400">🛵</span> ${rider.name}
                    </td>
                    <td class="py-3 px-3 font-mono font-bold text-amber-400 text-xs">#${rider.code || 'N/A'}</td>
                    <td class="py-3 px-3 text-xs text-turkish-500">${rider.phone}</td>
                    <td class="py-3 px-3 text-xs text-gray-400">${rider.area}</td>
                    <td class="py-3 px-3 text-right">
                        <button class="px-3 py-1 bg-turkish-700/60 hover:bg-turkish-600 text-xs text-white rounded-lg border border-turkish-500/30">
                            Daily Report ➔
                        </button>
                    </td>
                </tr>
            `;
        });
    });
}

// 5. RIDER PERFORMANCE HISTORY (Queries by Unique Rider Code)
window.openRiderDetails = async (riderId, riderCode) => {
    try {
        currentModalRiderId = riderId;
        const riderSnap = await getDoc(doc(db, "riders", riderId));
        if (!riderSnap.exists()) return;
        const rider = riderSnap.data();

        document.getElementById('modalRiderCodeBadge').innerText = `RIDER PIN: #${rider.code}`;
        document.getElementById('modalRiderName').innerText = rider.name;
        document.getElementById('modalRiderArea').innerText = `Assigned Route: ${rider.area} | ${rider.phone}`;

        // Query collections specifically matching this rider's PIN Code
        const qHistory = query(collection(db, "collections"), where("riderCode", "==", rider.code));
        const historySnap = await getDocs(qHistory);

        const historyTable = document.getElementById('modalRiderHistoryTable');
        historyTable.innerHTML = "";

        let grandTotalAmount = 0;
        let grandTotalVisits = 0;
        const dateMap = {};

        if (historySnap.empty) {
            historyTable.innerHTML = `<tr><td colspan="3" class="py-3 text-center text-gray-500">Is rider (PIN: #${rider.code}) ki koi collection history nahi mili.</td></tr>`;
        } else {
            historySnap.forEach((docSnap) => {
                const item = docSnap.data();
                const amt = Number(item.amount || 0);
                grandTotalAmount += amt;
                grandTotalVisits++;

                const dateStr = item.timestamp ? new Date(item.timestamp.toDate()).toLocaleDateString('en-PK') : 'Unknown Date';

                if (!dateMap[dateStr]) {
                    dateMap[dateStr] = { visits: 0, amount: 0 };
                }
                dateMap[dateStr].visits += 1;
                dateMap[dateStr].amount += amt;
            });

            Object.keys(dateMap).forEach((dateKey) => {
                const dayData = dateMap[dateKey];
                historyTable.innerHTML += `
                    <tr class="py-2">
                        <td class="py-2 font-bold text-gray-200">${dateKey}</td>
                        <td class="py-2 text-center text-emerald-400 font-bold">${dayData.visits} Shops Visited</td>
                        <td class="py-2 text-right font-black text-amber-400">Rs. ${dayData.amount.toLocaleString()}</td>
                    </tr>
                `;
            });
        }

        document.getElementById('modalRiderTotalAmount').innerText = `Rs. ${grandTotalAmount.toLocaleString()}`;
        document.getElementById('modalRiderTotalVisits').innerText = grandTotalVisits;
        document.getElementById('riderDetailModal').classList.remove('hidden');

    } catch (err) {
        alert("Error loading rider history: " + err.message);
    }
};

window.deleteCurrentRider = async () => {
    if (!currentModalRiderId) return;
    if (confirm("Kya aap waqai is rider ko delete karna chahte hain?")) {
        try {
            await deleteDoc(doc(db, "riders", currentModalRiderId));
            alert("✅ Rider successfully removed!");
            closeRiderModal();
        } catch (err) {
            alert("Error deleting rider: " + err.message);
        }
    }
};

window.closeRiderModal = () => {
    document.getElementById('riderDetailModal').classList.add('hidden');
    currentModalRiderId = null;
};

// Shop Modal Helpers
window.openShopDetails = async (shopId) => {
    try {
        currentModalShopId = shopId;
        const shopSnap = await getDoc(doc(db, "shops", shopId));
        if (!shopSnap.exists()) return;
        const shop = shopSnap.data();

        document.getElementById('modalShopId').innerText = `BOX ID: ${shopId}`;
        document.getElementById('modalShopName').innerText = shop.name;
        document.getElementById('modalShopArea').innerText = shop.area;
        document.getElementById('modalShopOwner').innerText = shop.owner || 'N/A';
        document.getElementById('modalShopPhone').innerText = shop.phone;
        document.getElementById('modalQrSubtext').innerText = `ID: ${shopId}`;

        const modalQrContainer = document.getElementById("modalQrcode");
        modalQrContainer.innerHTML = "";

        if (typeof QRCode !== 'undefined') {
            new QRCode(modalQrContainer, { text: shopId, width: 140, height: 140 });
        } else {
            const img = document.createElement('img');
            img.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${shopId}`;
            img.className = "mx-auto";
            modalQrContainer.appendChild(img);
        }

        const qHistory = query(collection(db, "collections"), where("shopId", "==", shopId));
        const historySnap = await getDocs(qHistory);

        const historyTable = document.getElementById('modalHistoryTable');
        historyTable.innerHTML = "";
        let shopTotal = 0;

        if (historySnap.empty) {
            historyTable.innerHTML = `<tr><td colspan="3" class="py-3 text-center text-gray-500">Is dukaan se abhi koi collection nahi hui.</td></tr>`;
        } else {
            historySnap.forEach((docSnap) => {
                const item = docSnap.data();
                shopTotal += Number(item.amount || 0);
                const date = item.timestamp ? new Date(item.timestamp.toDate()).toLocaleDateString('en-PK') : 'N/A';

                historyTable.innerHTML += `
                    <tr class="py-2">
                        <td class="py-2 text-gray-300">${date}</td>
                        <td class="py-2 text-gray-400">${item.collectorName}</td>
                        <td class="py-2 text-right font-bold text-amber-400">Rs. ${item.amount}</td>
                    </tr>
                `;
            });
        }

        document.getElementById('modalShopTotal').innerText = `Rs. ${shopTotal.toLocaleString()}`;
        document.getElementById('shopDetailModal').classList.remove('hidden');

    } catch (err) {
        alert("Error fetching shop history: " + err.message);
    }
};

window.deleteCurrentShop = async () => {
    if (!currentModalShopId) return;
    if (confirm("Kya aap waqai is dukaan ko delete karna chahte hain?")) {
        try {
            await deleteDoc(doc(db, "shops", currentModalShopId));
            alert("✅ Shop successfully deleted!");
            closeShopModal();
        } catch (error) {
            alert("Error deleting shop: " + error.message);
        }
    }
};

window.closeShopModal = () => {
    document.getElementById('shopDetailModal').classList.add('hidden');
    currentModalShopId = null;
};
