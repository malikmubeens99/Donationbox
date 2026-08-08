import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Add Shop & Generate QR
const addShopForm = document.getElementById('addShopForm');
if(addShopForm) {
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

            // Update UI Details
            document.getElementById('qrShopTitle').innerText = shopName;
            document.getElementById('qrShopArea').innerText = shopArea;
            document.getElementById('qrShopId').innerText = shopId;
            
            // Clean old QR if any
            const qrContainer = document.getElementById("qrcode");
            qrContainer.innerHTML = "";

            // Render QR Code safely
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: shopId,
                    width: 160,
                    height: 160
                });
            } else {
                // Reliable Fallback via Image API
                const img = document.createElement('img');
                img.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${shopId}`;
                img.className = "mx-auto";
                qrContainer.appendChild(img);
            }

            // Fix Tailwind Class toggle
            document.getElementById('qrPreviewWrapper').classList.remove('hidden');
            addShopForm.reset();

        } catch (error) {
            alert("Error adding shop: " + error.message);
        }
    });
}

// Live Feed Sync
const collectionLogs = document.getElementById('collectionLogs');
if(collectionLogs) {
    const q = query(collection(db, "collections"), orderBy("timestamp", "desc"));
    let totalAmount = 0;
    
    onSnapshot(q, (snapshot) => {
        collectionLogs.innerHTML = "";
        totalAmount = 0;
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

        document.getElementById('statTotalAmount').innerText = `Rs. ${totalAmount.toLocaleString()}`;
        document.getElementById('statTotalVisits').innerText = count;
    });
}
