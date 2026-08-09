import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Aap ki Real Firebase Configuration (donationbox-8e697)
const firebaseConfig = {
  apiKey: "AIzaSyD1Lz7uDui4928S-m1AlTTtPCuBcp-U4Sw",
  authDomain: "donationbox-8e697.firebaseapp.com",
  projectId: "donationbox-8e697",
  storageBucket: "donationbox-8e697.firebasestorage.app",
  messagingSenderId: "130828492156",
  appId: "1:130828492156:web:a3e2fb5ae1b260a04d18f9",
  measurementId: "G-RS2FQ425S0"
};

// Initialize Firebase & Firestore Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Add Shop & Generate Box QR Code
const addShopForm = document.getElementById('addShopForm');
if (addShopForm) {
    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shopName = document.getElementById('shopName').value;
        const ownerName = document.getElementById('ownerName').value;
        const ownerPhone = document.getElementById('ownerPhone').value;
        const shopArea = document.getElementById('shopArea').value;

        try {
            // Save shop to Firestore
            const docRef = await addDoc(collection(db, "shops"), {
                name: shopName,
                owner: ownerName,
                phone: ownerPhone,
                area: shopArea,
                createdAt: serverTimestamp()
            });

            const shopId = docRef.id;

            // Update UI Sticker Preview
            document.getElementById('qrShopTitle').innerText = shopName;
            document.getElementById('qrShopArea').innerText = shopArea;
            document.getElementById('qrShopId').innerText = shopId;
            
            // Clear previous QR
            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = "";

            // Render QR Code (with API Fallback)
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: shopId,
                    width: 160,
                    height: 160
                });
            } else {
                const img = document.createElement('img');
                img.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${shopId}`;
                img.className = "mx-auto";
                qrContainer.appendChild(img);
            }

            // Show QR Card
            document.getElementById('qrPreviewWrapper').classList.remove('hidden');
            addShopForm.reset();

        } catch (error) {
            alert("Error adding shop: " + error.message);
        }
    });
}

// Real-time Live Collections Feed
const collectionLogs = document.getElementById('collectionLogs');
if (collectionLogs) {
    const q = query(collection(db, "collections"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        collectionLogs.innerHTML = "";
        let totalAmount = 0;
        let count = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
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
