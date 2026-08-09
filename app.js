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

let currentModalShopId = null; // Track active shop in popup

// 1. Add Shop & Generate Box QR Code
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

// 2. Fetch & Display All Registered Shops List
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

// 3. Live Collection Logs Feed
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
            
            collectionLogs.innerHTML += `
                <tr class="hover:bg-turkish-800/30 transition">
                    <td class="py-3 px-3 text-xs text-gray-400">${date}</td>
                    <td class="py-3 px-3 font-bold text-white">${data.shopName}</td>
                    <td class="py-3 px-3 text-xs text-turkish-500">${data.area}</td>
                    <td class="py-3 px-3 font-black text-amber-400 text-right">Rs. ${data.amount}</td>
                    <td class="py-3 px-3 text-xs text-gray-300 text-right">${data.collectorName}</td>
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

// 4. Shop Detail Modal + Dynamic QR Generator Function
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

        // Render QR Code inside Modal
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

        // Fetch collections for this specific shop
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

// 5. Delete Shop Function
window.deleteCurrentShop = async () => {
    if (!currentModalShopId) return;
    
    const confirmDelete = confirm("Kya aap waqai is dukaan ko delete karna chahte hain? Database se is shop ka record khatam ho jaye ga.");
    
    if (confirmDelete) {
        try {
            await deleteDoc(doc(db, "shops", currentModalShopId));
            alert("✅ Shop database se successfully delete ho gayi!");
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
