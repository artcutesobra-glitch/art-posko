

function haptic(ms = 15){
  if ("vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

//*js//
/* =====================================================
   PH DATE (NO UTC DELAY)
===================================================== */
function getPHDate(){
  return new Date(
    new Date().toLocaleString("en-US",{ timeZone:"Asia/Manila" })
  );
}
function formatPHDate(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function getTodayPH(){ return formatPHDate(getPHDate()); }
function getMonthPH(){ return getTodayPH().slice(0,7); }

function getActiveDate(){
  return salesDate.value || getTodayPH();
}
function getActiveMonth(){
  return getActiveDate().slice(0,7);
}

let systemModalCallback = null;
let systemConfirmCallback = null;

/* =====================================================
   HEADER NAME (ADMIN ONLY)
===================================================== */
const headerTitle = document.querySelector("header b");

// LOAD SAVED HEADER NAME
(function(){
  const savedName = localStorage.getItem("pos_header_name");
  if(savedName !== null){
    headerTitle.textContent = savedName; // pwede blank
  }
})();


function changeHeaderName(){
  if(currentRole!=="admin") return;

  askPin("🔐 Confirm ADMIN PIN", pin=>{
    if(!verifyPin(pin)){
  showAlert("❌ WRONG PIN");
  return;
}


    openModal(`
      <h2>Change Header Name</h2>
      <input id="headerNameInput"
             type="text"
             placeholder="Enter new header name"
             maxlength="30"
             value="${headerTitle.textContent}">
      <div class="actions">
        <button class="save-btn" onclick="saveHeaderName()">SAVE</button>
        <button class="close-btn" onclick="closeModal()">CANCEL</button>
      </div>
    `);
  });
}


function saveHeaderName(){
  const input = document.getElementById("headerNameInput");
  if(!input) return;

  const name = input.value.trim(); // pwedeng empty

  headerTitle.textContent = name;
  localStorage.setItem("pos_header_name", name);

  closeModal();
  showAlert(
    name
      ? "✅ Header name updated"
      : "✅ Header cleared"
  );
}


/* =====================================================
   SYSTEM MODAL (ALERT / CONFIRM / PIN)
===================================================== */
const systemModal = document.getElementById("systemModal");
const systemModalBox = document.getElementById("systemModalBox");

function openModal(html){
  systemModalBox.innerHTML = html;
  systemModal.style.display = "flex";
  document.body.classList.add("modal-open");

  setTimeout(()=>{
    const input = systemModalBox.querySelector("input");
    if(input) input.focus();
  }, 50);
}
function submitConfirm(){
  closeModal();

  if(systemConfirmCallback){
    systemConfirmCallback();
    systemConfirmCallback = null;
  }
}


function closeModal(){
  systemModal.style.display = "none";
  systemModalBox.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function showAlert(msg, cb=null){
  openModal(`
    <h2>Notice</h2>
    <p>${msg}</p>
    <button class="save-btn" id="alertOk">OK</button>
  `);

  document.getElementById("alertOk").onclick = () => {
    closeModal();
    if(cb) cb();
  };
}


function showConfirm(msg, yes){
  systemConfirmCallback = yes;

  openModal(`
    <h2>Confirm</h2>
    <p>${msg}</p>
    <div class="actions">
      <button class="save-btn" onclick="submitConfirm()">YES</button>
      <button class="close-btn" onclick="closeModal()">NO</button>

    </div>
  `);
}


function askPin(title, cb){
  systemModalCallback = cb;

  openModal(`
    <h2>${title}</h2>
    <input id="pinInput" type="password" maxlength="6" autofocus>
    <div class="actions">
      <button class="save-btn" onclick="submitPin()">OK</button>
      <button class="close-btn" onclick="closeModal()">CANCEL</button>
    </div>
  `);
}

function submitPin(){
  const input = document.getElementById("pinInput");
  if(!input) return;

  const value = input.value;
  closeModal();

  if(systemModalCallback){
    systemModalCallback(value);
    systemModalCallback = null;
  }
}
function getDeviceFingerprint(){
  return btoa(
    navigator.userAgent +
    screen.width +
    screen.height +
    navigator.language
  );
}

function getDeviceId(){
  let id = localStorage.getItem("pos_device_id");
  if(!id){
    id = "DEV-" + crypto.randomUUID();
    localStorage.setItem("pos_device_id", id);
  }
  return id;
}
function hashPin(pin){
  const deviceId = getDeviceId();
  return btoa(deviceId + "::" + pin);
}

function verifyPin(inputPin){
  const savedHash = localStorage.getItem("pos_pin_hash");
  if(!savedHash) return false;
  return hashPin(inputPin) === savedHash;
}

function isAPK(){
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    /wv|android/i.test(navigator.userAgent)
  );
}
(function lockDevice(){

  // 🖥️ DEV MODE — PC BROWSER (NO LOCK)
  if(!isAPK()){
    console.warn("DEV MODE: Device lock disabled (browser)");
    return;
  }

  // 📱 APK MODE — HARD LOCK
  const key = "pos_device_fingerprint";
  const current = getDeviceFingerprint();
  const stored = localStorage.getItem(key);

  if(!stored){
    // FIRST INSTALL → bind device
    localStorage.setItem(key, current);
  }else if(stored !== current){
    document.body.innerHTML = `
      <div style="
        height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#000;
        color:#fff;
        font-size:22px;
        font-weight:900;
        text-align:center;
      ">
        🔒 DEVICE LOCKED<br><br>
        This POS is bound to another device.
      </div>
    `;
    throw new Error("DEVICE MISMATCH");
  }

})();


/* =====================================================
   INIT PIN (RUN ONCE – DEFAULT PIN)
===================================================== */
(function initPin(){
  if(!localStorage.getItem("pos_pin_hash")){
    const defaultPin = "1234"; // 👈 palitan mo dito kung gusto
    localStorage.setItem(
      "pos_pin_hash",
      hashPin(defaultPin)
    );
  }
})();


/* =====================================================
   GET MASTER PIN (SINGLE SOURCE OF TRUTH)
===================================================== */

let currentRole = "cashier"; // cashier | admin
let pinLocked = false;


function requireAdmin(){
  if(currentRole === "admin") return true;
  showAlert("⛔ ADMIN ONLY");
  return false;
}

/* ===========================
   TOGGLE ADMIN / CASHIER
=========================== */
function togglePin(){
  askPin(
    currentRole === "cashier"
      ? "🔐 Enter ADMIN PIN"
      : "🔐 Enter PIN to return to CASHIER",
    pin=>{
      if(!verifyPin(pin)){
        showAlert("❌ WRONG PIN");
        return;
      }

      if(currentRole === "cashier"){
        currentRole = "admin";
        showAlert("✅ ADMIN MODE ENABLED");
      }else{
        currentRole = "cashier";
        showAlert("🔓 Returned to CASHIER mode");
      }

      updateRoleUI();
    }
  );
}

function lockAdmin(){
  if(currentRole !== "admin") return;

  currentRole = "cashier";
  pinLocked = true;

  updateRoleUI();
  showAlert("🔒 ADMIN LOCKED");
}



/* =====================================================
   CHANGE PIN – DEDICATED MODAL (NO CALLBACK COLLISION)
===================================================== */
let changePinState = 0; // 0=current, 1=new, 2=confirm
let changePinTemp = {
  current: "",
  next: ""
};

const changePinModal = document.getElementById("changePinModal");
const cpTitle = document.getElementById("cp-title");
const cpInput = document.getElementById("cp-input");

function changePin(){
  if(currentRole!=="admin") return;

  changePinState = 0;
  changePinTemp = { current:"", next:"" };

  cpTitle.textContent = "🔐 Enter CURRENT PIN";
  cpInput.value = "";
  cpInput.placeholder = "Current PIN";

  openChangePin();
}

function openChangePin(){
  changePinModal.style.display = "flex";
  document.body.classList.add("modal-open");
  setTimeout(()=>cpInput.focus(),50);
}

function closeChangePin(){
  changePinModal.style.display = "none";
  cpInput.value = "";
  document.body.classList.remove("modal-open");
}

function changePinNext(){
  const val = cpInput.value.trim();

  /* =========================
     STEP 0 — CURRENT PIN
  ========================= */
  if(changePinState === 0){
    if(!verifyPin(val)){
      cpInput.value = "";
      cpInput.focus();
      showAlert("❌ WRONG CURRENT PIN");
      return;
    }

    changePinTemp.current = val;
    changePinState = 1;

    cpTitle.textContent = "🔑 Enter NEW PIN (4–6 digits)";
    cpInput.value = "";
    cpInput.placeholder = "New PIN";
    return;
  }

  /* =========================
     STEP 1 — NEW PIN
  ========================= */
  if(changePinState === 1){
    if(!/^\d{4,6}$/.test(val)){
      cpInput.value = "";
      cpInput.focus();
      showAlert("❌ PIN must be 4–6 digits");
      return;
    }

    changePinTemp.next = val;
    changePinState = 2;

    cpTitle.textContent = "🔁 Confirm NEW PIN";
    cpInput.value = "";
    cpInput.placeholder = "Confirm PIN";
    return;
  }

  /* =========================
     STEP 2 — CONFIRM PIN
  ========================= */
  if(changePinState === 2){
    if(val !== changePinTemp.next){
      closeChangePin();
      showAlert("❌ PIN does not match");
      return;
    }

    localStorage.setItem("pos_pin_hash", hashPin(changePinTemp.next));

    currentRole = "cashier";
    pinLocked = false;
    updateRoleUI();

    closeChangePin();
    showAlert("✅ NEW PIN SAVED & APPLIED");
  }
}


function cancelOrder(){
  if(cart.length === 0){
    showAlert("ℹ️ No order to cancel");
    return;
  }

  showConfirm("Cancel current order?", ()=>{

    // 🔥 RETURN STOCK ONLY IF NORMAL ORDER
    cart.forEach(i=>{
  const base = unpaidBaseQty[i.id] || 0;
  const added = i.qty - base;

  if(added > 0){
    const p = products.find(x=>x.id===i.id);
    if(p){
      p.stock += added;
      saveProductDB(p);
    }
  }
});


    resetOrder();

    unpaidBaseQty = {};
    resumedUnpaidSale = null;
    isResumedUnpaid = false;
    lastCompletedOrderGroupId = null;

    loadProducts();
    showAlert("❌ ORDER CANCELLED");
  });
}



function closeCheckout(){

  // 🔥 RETURN ONLY ADDED ITEMS (SAFE FOR RESUMED UNPAID)
  cart.forEach(i=>{
    const base = unpaidBaseQty[i.id] || 0;
    const added = i.qty - base;

    if(added > 0){
      const p = products.find(x=>x.id===i.id);
      if(p){
        p.stock += added;
        saveProductDB(p);
      }
    }
  });

  resetOrder();

  unpaidBaseQty = {};
  resumedUnpaidSale = null;
  isResumedUnpaid = false;
  lastCompletedOrderGroupId = null;

  loadProducts();
  closeModal();
}




function resumeUnpaidOrderById(id){

  if(resumeLocked) return;
  resumeLocked = true;

  // 🔒 BLOCK IF MAY LAMAN PA ANG CART
  if(cart.length > 0){
    resumeLocked = false;
    showAlert("❌ Finish or cancel current order first");
    return;
  }

  if(!db){
    resumeLocked = false;
    return;
  }

  const tx = db.transaction("sales");
  const store = tx.objectStore("sales");

  store.get(id).onsuccess = e=>{
    const sale = e.target.result;

    if(sale){
      resumeUnpaidOrder(sale);
    }else{
      showAlert("❌ Unpaid order not found");
    }

    resumeLocked = false;
  };

  store.get(id).onerror = ()=>{
    resumeLocked = false;
    showAlert("❌ Failed to load unpaid order");
  };
}



function resumeUnpaidOrder(sale){
  if(sale.status !== "unpaid") return;

  resetOrder();
  unpaidBaseQty = {};
  isResumedUnpaid = true;
  // 🔒 INIT BASE QTY MAP
products.forEach(p=>{
  unpaidBaseQty[p.id] = 0;
});


  sale.items.forEach(i=>{
    const p = products.find(x=>x.id===i.productId);
    if(!p) return;

    

    cart.push({
      id: i.productId,
      name: i.name,
      price: i.price,
      qty: i.qty
    });

    unpaidBaseQty[i.productId] = i.qty;
  });

  lastCompletedOrderGroupId = sale.orderGroupId;
  resumedUnpaidSale = sale;

  renderCart();
  // 🔄 FORCE MENU REFRESH AFTER RESUME
  products.forEach(p => saveProductDB(p));

  renderMenu();

  showAlert(`🧾 Resumed UNPAID order\n👤 ${sale.customerName || "No name"}`);
}



function resetCartOnly(){
  cart = [];
  cash = "0";

  cartItems.innerHTML = "";
  total.textContent = "0";
  cashEl.textContent = "0";
  change.textContent = "0";
  totalQtyEl.textContent = "0";

  totalAmountCache = 0;
  updateNumpadState();
}

/* =====================================================
   DATABASE
===================================================== */
const DB="posDB", P="products", S="sales";
let db, products=[], cart=[], cash="", editingId=null;
let unpaidBaseQty = {}; 
// { productId: originalQty }
// 🔥 ADD-ON ORDER (PAHABOL)
let lastCompletedOrderGroupId = null;
// 🔥 RESUME UNPAID ORDER STATE
let resumedUnpaidSale = null;
let isResumedUnpaid = false;
let checkoutLocked = false;
let resumeLocked = false;
let voidLocked = false;
let addCartLocked = false;



const req = indexedDB.open(DB, 7);
req.onupgradeneeded = e => {
  const d = e.target.result;

  if(!d.objectStoreNames.contains("products")){
    d.createObjectStore("products",{ keyPath:"id" });
  }

  if(!d.objectStoreNames.contains("sales")){
    d.createObjectStore("sales",{ keyPath:"id" });
  }

  if(!d.objectStoreNames.contains("backups")){
    d.createObjectStore("backups",{ keyPath:"id" });
  }

   // 🔥 ADD THIS
  if(!d.objectStoreNames.contains("expenses")){
    d.createObjectStore("expenses",{ keyPath:"id" });
  }

};

// 🔒 SAFETY GUARD
req.onblocked = () => {
  alert("❌ Please close other POS tabs or devices");
};

req.onsuccess=e=>{
  db=e.target.result;
  loadProducts();
  loadSales();
  updateRoleUI(); // 👈
};

/* =====================================================
   EDIT PRODUCT (ADMIN ONLY)
===================================================== */
function openProductModal(){
  if(currentRole!=="admin") return;

  renderProductList();
  document.getElementById("productPage").classList.remove("hidden");
  document.body.classList.add("modal-open");
}


function closeProductModal(){
  productModal.style.display="none";
  clearProductForm();
}

function closeProductPage(){

  // close inventory page
  document.getElementById("productPage").classList.add("hidden");
  document.body.classList.remove("modal-open");
  clearProductForm();

  // 🔄 HARD REFRESH APP STATE
  loadProducts();     // reload products from IndexedDB
  loadSales();        // refresh summaries if needed
  resetOrder();       // clear any temp cart state
}


function renderProductList(){
  productList.innerHTML = "";

  products.forEach(p=>{
    let cls = "inventory-item";
    if(p.stock <= 0) cls += " out";
    else if(p.stock <= 5) cls += " low";

    productList.innerHTML += `
      <div class="${cls}">
        
        <div class="inv-info" onclick="editProduct(${p.id})">
          <b>${p.name}</b><br>
          <small>₱${p.price}</small>
        </div>

        <div class="inv-stock">
          <button class="stock-btn minus"
            onpointerdown="startHold(${p.id}, -1)"
            onpointerup="stopHold()"
            onpointerleave="stopHold()"
            onclick="quickStock(${p.id}, -1)">
            −
          </button>

          <span class="stock-val"
            onclick="editStockValue(${p.id}, this)">
            ${p.stock}
          </span>

          <button class="stock-btn plus"
            onpointerdown="startHold(${p.id}, 1)"
            onpointerup="stopHold()"
            onpointerleave="stopHold()"
            onclick="quickStock(${p.id}, 1)">
            +
          </button>
        </div>

      </div>
    `;
  });
}

/* ✏️ DIRECT EDIT STOCK VALUE */
function editStockValue(id, el){
  const p = products.find(x=>x.id===id);
  if(!p) return;

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = p.stock;
  input.className = "stock-edit-input";

  el.replaceWith(input);
  input.focus();
  input.select();

  function save(){
    let val = parseInt(input.value);
    if(isNaN(val) || val < 0) val = p.stock;

    p.stock = val;
    saveProductDB(p);
    renderProductList();
  }

  input.addEventListener("blur", save);
  input.addEventListener("keydown", e=>{
    if(e.key === "Enter") input.blur();
    if(e.key === "Escape") renderProductList();
  });
}

function quickStock(id, delta){
  const p = products.find(x => x.id === id);
  if(!p) return;

  // prevent negative stock
  if(p.stock + delta < 0) return;

  p.stock += delta;
  saveProductDB(p);

  renderProductList();
}

/* =====================================================
   🧾 INVENTORY EXPORT
===================================================== */
function exportInventory(type="csv"){
  if(!products.length){
    showAlert("❌ No inventory to export");
    return;
  }

  const date = getTodayPH();

  const rows = products.map(p=>({
    name: p.name,
    stock: p.stock || 0,
    selling_price: p.price || 0,
    retail_price: p.retail || 0,
    inventory_value: (p.stock||0)*(p.retail||0)
  }));

  // JSON
  if(type==="json"){
    const payload = {
      type:"POS_INVENTORY_EXPORT",
      date,
      device:getDeviceId(),
      items:rows
    };

    downloadBlob(
      new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),
      `inventory-${date}.json`
    );
    showAlert("✅ Inventory exported (JSON)");
    return;
  }

  // CSV
  const csv =
`Product Name,Stock,Selling Price,Retail Price,Inventory Value
${rows.map(r=>`"${r.name}",${r.stock},${r.selling_price},${r.retail_price},${r.inventory_value}`).join("\n")}`;

  downloadBlob(new Blob([csv],{type:"text/csv"}),`inventory-${date}.csv`);
  showAlert("✅ Inventory exported (CSV)");
}


function downloadBlob(blob, filename){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
/* =====================================================
   📥 INVENTORY IMPORT
===================================================== */
document
  .getElementById("importInventoryInput")
  .addEventListener("change", e=>{

    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();

    reader.onload = ev=>{
      let data;

      try{
        data = JSON.parse(ev.target.result);
      }catch{
        showAlert("❌ Invalid inventory file");
        return;
      }

      if(
        data.type !== "POS_INVENTORY_EXPORT" ||
        !Array.isArray(data.items)
      ){
        showAlert("❌ Invalid inventory format");
        return;
      }

      askPin("🔐 Confirm ADMIN PIN", pin=>{
        if(!verifyPin(pin)){
          showAlert("❌ WRONG PIN");
          return;
        }

        data.items.forEach(item=>{
          const existing = products.find(
            p => p.name.trim().toLowerCase() ===
                 item.name.trim().toLowerCase()
          );

          const prod = {
            id: existing?.id || Date.now()+Math.random(),
            name: item.name,
            stock: +item.stock || 0,
            price: +item.selling_price || 0,
            retail: +item.retail_price || 0,
            commission: existing?.commission || 0,
            image: existing?.image || null
          };

          saveProductDB(prod);
        });

        loadProducts();
        renderProductList();
        showAlert("✅ Inventory imported successfully");
      });
    };

    reader.readAsText(file);
    e.target.value = "";
  });


/* =====================================================
   INVENTORY PAGE HELPERS
===================================================== */

// 🔍 SEARCH (Inventory Feel)
function filterInventory(q){
  q = q.toLowerCase();

  document
    .querySelectorAll(".inventory-item")
    .forEach(item=>{
      item.style.display =
        item.textContent.toLowerCase().includes(q)
          ? "flex"
          : "none";
    });
}

// ➕ NEW PRODUCT BUTTON
function newProduct(){
  clearProductForm();
  editingId = null;
  openProductEditor();
}


/* =====================================================
   INVENTORY HEADER DROPDOWN
===================================================== */
function toggleInventoryHeaderMenu(){
  const menu = document.getElementById("inventoryHeaderMenu");
  if(!menu) return;

  menu.style.display =
    menu.style.display === "block" ? "none" : "block";
}

// auto close pag click sa labas
document.addEventListener("click", e=>{
  if(!e.target.closest(".inv-title-wrap")){
    const menu = document.getElementById("inventoryHeaderMenu");
    if(menu) menu.style.display = "none";
  }
});


function editProduct(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;

  editingId = id;

  pname.value   = p.name;
  pprice.value  = p.price;
  pretail.value = p.retail || 0;
  pcomm.value   = p.commission || 0;
  pstock.value  = p.stock;

  openProductEditor();
}



function saveProduct(){
  if(!pname.value || !pprice.value){
  showAlert("❌ Fill name & price");
  return;
}


  const file=pimg.files[0];
  const img=file?file:products.find(p=>p.id===editingId)?.image||null;

  saveProductDB({
  id: editingId || Date.now(),
  name: pname.value,
  price: +pprice.value,        // selling price
  retail: +pretail.value || 0, // 🔥 RETAIL PRICE (PUHUNAN)
  commission: +pcomm.value || 0,
  stock: +pstock.value || 0,
  image: img
});


  loadProducts();
  renderProductList();
  clearProductForm();
}

function deleteProduct(id){
  if(currentRole!=="admin") return;

  showConfirm("Delete this product?", ()=>{
    db.transaction(P,"readwrite").objectStore(P).delete(id);
    loadProducts();
    renderProductList();
  });
}


function clearProductForm(){
  editingId = null;
  pname.value = "";
  pprice.value = "";
  pretail.value = ""; // 🔥
  pcomm.value = "";
  pstock.value = "";
  pimg.value = "";
}

/* =====================================================
   PRODUCT EDITOR MODAL (OPEN / CLOSE)
===================================================== */

function openProductEditor(){
  document.getElementById("productEditorModal").style.display = "flex";
  document.body.classList.add("modal-open");
}

function closeProductEditor(){
  document.getElementById("productEditorModal").style.display = "none";
  document.body.classList.remove("modal-open");
  clearProductForm();
}

/* =====================================================
   PRODUCTS
===================================================== */
function loadProducts(){
  db.transaction(P).objectStore(P).getAll().onsuccess=e=>{
    products=e.target.result||[];
    renderMenu();
  };
}
function saveProductDB(p){
  db.transaction(P,"readwrite").objectStore(P).put(p);
}

/* =====================================================
   SALES SAVE
===================================================== */
function saveSaleFromCart(orderGroupId = null, status = "paid", customerName = ""){


  const items = cart.map(i=>{
    const p = products.find(p=>p.id===i.id);
    if(!p) return null;

    return {
      productId: p.id,
      name: p.name,
      qty: i.qty,
      price: i.price,
      retail: p.retail || 0,
      commission: p.commission || 0
    };
  }).filter(Boolean);

  const commissionTotal =
    items.reduce((s,i)=>s + (i.qty*i.commission),0);

  const groupId =
    lastCompletedOrderGroupId || ("GRP-" + Date.now());

  lastCompletedOrderGroupId = groupId;

  db.transaction("sales","readwrite")
    .objectStore("sales")
    .add({
  id: Date.now(),
  orderGroupId: groupId,
  date: new Date().toLocaleString("en-PH"),
  dateOnly: getTodayPH(),
  month: getMonthPH(),
  items,
  total: +total.textContent,
  commissionTotal,
  status,          // 🔥 PAID | UNPAID
  customerName     // ✅ ITO ANG KULANG
});


  return groupId;
}


function backupBeforeVoid(reason="manual"){
  const tx = db.transaction(["sales","products","backups"],"readwrite");
  const salesStore = tx.objectStore("sales");
  const productStore = tx.objectStore("products");
  const backupStore = tx.objectStore("backups");

  Promise.all([
    new Promise(r=>salesStore.getAll().onsuccess=e=>r(e.target.result)),
    new Promise(r=>productStore.getAll().onsuccess=e=>r(e.target.result))
  ]).then(([sales,products])=>{
    backupStore.add({
      id: Date.now(),
      date: new Date().toLocaleString("en-PH"),
      reason,
      sales,
      products
    });
  });
}
function restoreLastBackup(){
  if(currentRole!=="admin") return;

  // 1️⃣ Basahin muna ang backups (READ ONLY)
  const readTx = db.transaction("backups", "readonly");
  const backupStore = readTx.objectStore("backups");

  backupStore.getAll().onsuccess = e => {
    const list = e.target.result;

    if(!list || !list.length){
      showAlert("❌ No backup found");
      return;
    }

    const last = list[list.length - 1];

    // 2️⃣ Confirm muna
    showConfirm("Restore last backup? This will overwrite data.", () => {

      // 3️⃣ NEW transaction for restore (IMPORTANT)
      const writeTx = db.transaction(["sales","products"], "readwrite");
      const salesStore = writeTx.objectStore("sales");
      const productStore = writeTx.objectStore("products");

      // CLEAR EXISTING DATA
      salesStore.clear();
      productStore.clear();

      // RESTORE SALES
      last.sales.forEach(s => salesStore.add(s));

      // RESTORE PRODUCTS
      last.products.forEach(p => productStore.add(p));

      writeTx.oncomplete = () => {
        loadProducts();
        loadSales();
        showAlert("♻️ Backup restored successfully");
      };

      writeTx.onerror = () => {
        showAlert("❌ Restore failed");
      };

    });
  };
}



/* =====================================================
   SALES LOAD + RENDER
===================================================== */
function loadSales(){
  if(!db) return;
  db.transaction(S).objectStore(S).getAll().onsuccess=e=>{
    renderSales(e.target.result||[]);
  };
}

function getSalesByDate(date){
  return new Promise(res=>{
    db.transaction("sales")
      .objectStore("sales")
      .getAll().onsuccess = e=>{
        res((e.target.result||[]).filter(s=>s.dateOnly===date));
      };
  });
}

function getExpensesByDate(date){
  return new Promise(res=>{
    if(!db.objectStoreNames.contains("expenses")){
      res([]);
      return;
    }
    db.transaction("expenses")
      .objectStore("expenses")
      .getAll().onsuccess = e=>{
        res((e.target.result||[]).filter(x=>x.date===date));
      };
  });
}

function getRetailForItem(item){
  // 1️⃣ kung may retail na sa sales snapshot
  if(item.retail && item.retail > 0){
    return item.retail;
  }

  // 2️⃣ try match by productId
  let p = products.find(p => p.id === item.productId);

  // 3️⃣ fallback: match by name (IMPORTED SAFE)
  if(!p){
    p = products.find(
      p =>
        p.name.trim().toLowerCase() ===
        item.name.trim().toLowerCase()
    );
  }

  return p?.retail || 0;
}


function openEODModal(){
  if(currentRole !== "admin"){
    showAlert("⛔ ADMIN ONLY");
    return;
  }

  const modal = document.getElementById("eodModal");
  modal.style.display = "block";

  requestAnimationFrame(()=>{
    modal.style.display = "flex";
  });

  document.body.classList.add("modal-open");

  const date = getActiveDate();

  Promise.all([
    getSalesByDate(date),
    getExpensesByDate(date)
  ]).then(([sales, expenses])=>{

    let totalSales = 0;
let cogs = 0;
let expenseTotal = 0;
let commissionTotal = 0; // ✅ ADD THIS
let itemMap = {};


let inventoryHTML = "";
let salesBreakdownTotal = 0;
let inventoryTotal = 0;


    sales.forEach(s=>{
  totalSales += s.total;
  commissionTotal += s.commissionTotal || 0;

  s.items.forEach(i=>{
    const retail = getRetailForItem(i);
    cogs += i.qty * retail;

    if(!itemMap[i.name]){
      itemMap[i.name] = { qty:0, sales:0 };
    }

    itemMap[i.name].qty   += i.qty;
    itemMap[i.name].sales += i.qty * i.price;

    // ✅ ADD THIS
    salesBreakdownTotal += i.qty * i.price;
  });
});







    expenses.forEach(e=> expenseTotal += e.amount);

    const gross = totalSales - cogs;
    const net =
  totalSales
  - cogs
  - commissionTotal
  - expenseTotal;


    products.forEach(p=>{
  if(p.stock > 0){
    const value = p.stock * (p.retail || 0);
    inventoryTotal += value;

    inventoryHTML += `
      <div>
        ${p.name} x${p.stock}
        <span style="float:right">
          ₱${value.toFixed(2)}
        </span>
      </div>
    `;
  }
});


    eodDate.innerHTML = `<b>Date:</b> ${date}`;
    eodSummary.innerHTML = `
  <div>Sales: ₱${totalSales.toFixed(2)}</div>
  <div>COGS: ₱${cogs.toFixed(2)}</div>
  <div>Commission: ₱${commissionTotal.toFixed(2)}</div>
  <div>Expenses: ₱${expenseTotal.toFixed(2)}</div>
  <hr>
  <b>NET PROFIT: ₱${net.toFixed(2)}</b>
`;

    eodItems.innerHTML = `
  ${
    Object.keys(itemMap).length
      ? Object.entries(itemMap).map(([n,v])=>`
          <div>
            ${n} x${v.qty}
            <span style="float:right">
              ₱${v.sales.toFixed(2)}
            </span>
          </div>
        `).join("")
      : "<small>No sales</small>"
  }

  <hr>
  <div style="font-weight:900">
    TOTAL SALES:
    <span style="float:right">
      ₱${salesBreakdownTotal.toFixed(2)}
    </span>
  </div>
`;



    eodInventory.innerHTML = `
  ${inventoryHTML || "<small>No remaining stock</small>"}

  <hr>
  <div style="font-weight:900">
    TOTAL INVENTORY VALUE:
    <span style="float:right">
      ₱${inventoryTotal.toFixed(2)}
    </span>
  </div>
`;

  });
}


function closeEODModal(){
  document.getElementById("eodModal").style.display = "none";
  document.body.classList.remove("modal-open");
}


function renderSales(list){
  salesHistory.innerHTML = "";

  const frag = document.createDocumentFragment();

  let todayTotal = 0,
      monthTotal = 0,
      commissionToday = 0;

  const d = getActiveDate(),
        m = getActiveMonth();

  /* ===============================
     TODAY SALES LIST
  =============================== */
  const todaySalesList = list.filter(s => s.dateOnly === d);
const totalToday = todaySalesList.length;

todaySalesList
  .slice()
  .reverse()
  .forEach((s, index) => {

    todayTotal += s.total;
    commissionToday += s.commissionTotal || 0;

    const orderNo = totalToday - index; // 🔥 DAILY RESET NUMBER

    const entry = document.createElement("div");
    entry.className = "sales-entry";

    entry.innerHTML = `
  <div>
    <b>
      #${orderNo} — ${s.date}
      ${
        s.status === "unpaid"
? `<span style="color:#ff5252;font-weight:900">
    (UNPAID – ${s.customerName || "No name"})
  </span>`
: ''

      }
    </b>

    <div class="sales-items">
      ${s.items.map(i => `${i.name} x${i.qty}`).join(", ")}
    </div>
  </div>

  <div>
    <b>₱${s.total.toFixed(2)}</b><br>

    ${
  s.status === "unpaid"
  ? `
    <button
  class="paid-btn"
  onclick="resumeUnpaidOrderById(${s.id})"
  ${cart.length > 0 ? "disabled" : ""}>
  ➕ ADD
</button>


    
  `
  : ""
}


    <!-- 🔒 ADMIN ONLY -->
    ${
  s.status === "paid"
  ? `<button
        class="void-btn"
        onclick="voidTransaction(${s.id})"
        data-admin>
        VOID
     </button>`
  : ""
}

  </div>
`;




    frag.appendChild(entry); // ✅ tama na
  });

// 🔥 ITO ANG SUSI — ISANG BES LANG
salesHistory.appendChild(frag);



  /* ===============================
     MONTHLY TOTAL
  =============================== */
  monthTotal = list
  .filter(s => s.month === m)
  .reduce((sum, s) => sum + s.total, 0);


  todaySales.textContent = todayTotal.toFixed(2);
  monthlySales.textContent = monthTotal.toFixed(2);
  commissionSales.textContent = commissionToday.toFixed(2);

  /* ===============================
   💸 EXPENSES TODAY + 📈 PROFIT
=============================== */
let expensesToday = 0;

if(db && db.objectStoreNames.contains("expenses")){
  db.transaction("expenses")
    .objectStore("expenses")
    .getAll().onsuccess = e => {

      (e.target.result || []).forEach(x=>{
        if(x.date === d){
          expensesToday += x.amount;
        }
      });

      // 💸 EXPENSES TODAY
      expensesTodayEl.textContent =
        expensesToday.toFixed(2);

      // 📈 PROFIT TODAY (FINAL FORMULA)
      const profit =
        todayTotal
        - commissionToday
        - expensesToday;

      
    };
}else{
  // fallback safety
  expensesTodayEl.textContent = "0.00";

  const profit =
    todayTotal
    - commissionToday;

  
}


  /* ===============================
     APPLY ROLE VISIBILITY
  =============================== */
  updateRoleUI();
}





/* =====================================================
   VOID (ADMIN ONLY)
===================================================== */
function voidTransaction(id){
  if(currentRole !== "admin") return;
  if(voidLocked) return;

  voidLocked = true;

  const txCheck = db.transaction("sales");
  const store = txCheck.objectStore("sales");

  store.get(id).onsuccess = e => {
    const sale = e.target.result;
    if(!sale){
      voidLocked = false;
      return;
    }

    // 🔒 BLOCK UNPAID
    if(sale.status === "unpaid"){
      voidLocked = false;
      showAlert("⛔ Cannot VOID unpaid order");
      return;
    }

    showConfirm("Void this transaction?", ()=>{

      // 🔓 UNLOCK ONLY ON CONFIRM
      voidLocked = false;

      backupBeforeVoid("void single transaction");

      const tx = db.transaction([S,P],"readwrite");
      const ss = tx.objectStore(S);
      const ps = tx.objectStore(P);

      ss.get(id).onsuccess = e=>{
        const sale = e.target.result;
        if(!sale) return;

        ps.getAll().onsuccess = ev=>{
          const plist = ev.target.result;

          sale.items.forEach(it=>{
            const p = plist.find(x=>x.id===it.productId);
            if(!p) return;

            p.stock += it.qty;
            ps.put(p);
          });

          ss.delete(id);
        };
      };

      tx.oncomplete = ()=>{
        loadProducts();
        loadSales();
      };
    });

    // 🔓 SAFETY UNLOCK IF USER CLOSES MODAL (ESC / OUTSIDE)
    setTimeout(()=>{
      if(systemModal.style.display !== "flex"){
        voidLocked = false;
      }
    },300);
  };
}



function markSaleAsPaid(saleId){

  const tx = db.transaction("sales","readwrite");
  const store = tx.objectStore("sales");

  store.get(saleId).onsuccess = e=>{
    const sale = e.target.result;
    if(!sale){
      showAlert("❌ Sale not found");
      return;
    }

    if(sale.status === "paid"){
      showAlert("ℹ️ Already PAID");
      return;
    }

    // 🔥 MARK AS PAID (NO STOCK TOUCH)
    sale.status = "paid";
    sale.paidAt = new Date().toLocaleString("en-PH");

    store.put(sale);

    tx.oncomplete = ()=>{
      loadSales();
      showAlert("✅ Order marked as PAID");
    };
  };
}




function voidAllByDate(){
  if(currentRole !== "admin") return;

  const d = getActiveDate();

  db.transaction("sales")
    .objectStore("sales")
    .getAll().onsuccess = e => {

      const list = e.target.result || [];
      const hasUnpaid = list.some(
        s => s.dateOnly === d && s.status === "unpaid"
      );

      // 🔒 BLOCK IF MAY UNPAID
      if(hasUnpaid){
        showAlert("⛔ Cannot VOID ALL while there are UNPAID orders");
        return;
      }

      showConfirm("Void ALL transactions on this date?", ()=>{

        backupBeforeVoid("void ALL by date");

        const tx = db.transaction([S,P],"readwrite");
        const ss = tx.objectStore(S);
        const ps = tx.objectStore(P);

        ss.getAll().onsuccess = e=>{
          const sales = e.target.result || [];

          ps.getAll().onsuccess = ev=>{
            const plist = ev.target.result;

            sales.forEach(s=>{
              if(s.dateOnly === d){

                s.items.forEach(it=>{
                  const p = plist.find(x=>x.id===it.productId);
                  if(!p) return;

                  // ✅ SAFE (ALL PAID DITO)
                  p.stock += it.qty;
                  ps.put(p);
                });

                ss.delete(s.id);
              }
            });
          };
        };

        tx.oncomplete = ()=>{ loadProducts(); loadSales(); };
      });
    };
}



/* =====================================================
   ORDER RESET (SINGLE SOURCE OF TRUTH)
===================================================== */
function resetOrder(){
  cart = [];
  cash = "0";

  cartItems.innerHTML = "";
  total.textContent = "0";
  cashEl.textContent = "0";
  change.textContent = "0";
  totalQtyEl.textContent = "0";

  totalAmountCache = 0;   // 🔥 important for computeChange
  updateNumpadState();
}




/* =====================================================
   MENU + CART
===================================================== */
function renderMenu(){
  menu.innerHTML = "";

  products.forEach(p=>{
    let cls="stock-badge", txt=p.stock+" left";
    if(p.stock<=0){ cls+=" out"; txt="OUT"; }
    else if(p.stock<=5){ cls+=" low"; }

    const imgURL = p.image ? URL.createObjectURL(p.image) : null;

   const card = document.createElement("div");
card.className = "menu-card";

if(p.stock <= 0){
  card.classList.add("out");
}


    card.innerHTML = `
      <span class="${cls}">${txt}</span>
      ${imgURL ? `<img>` : ``}
      <div class="menu-name">${p.name}</div>
      <button class="price-btn" ${p.stock<=0?"disabled":""}>
        ₱${p.price}
      </button>
    `;

    if(imgURL){
      const img = card.querySelector("img");
      img.src = imgURL;
      img.onload = () => URL.revokeObjectURL(imgURL);
    }

    card.querySelector("button").onclick = ()=>addToCart(p.id);
    menu.appendChild(card);
  });
}


function addToCart(id){
  if(addCartLocked) return;
  addCartLocked = true;

  const p = products.find(x => x.id === id);

  if(!p || p.stock <= 0){
    addCartLocked = false;
    showAlert("❌ Out of stock");
    return;
  }

  p.stock--;

  const i = cart.find(x => x.id === id);
  i ? i.qty++ : cart.push({
    id:p.id,
    name:p.name,
    price:p.price,
    qty:1
  });

  renderCart();
  renderMenu();

  // 🔓 QUICK UNLOCK
  setTimeout(()=>addCartLocked=false,80);
}




function renderCart(){
  cartItems.innerHTML = "";

  let totalAmount = 0;
  let totalQty = 0;

  cart.forEach(i=>{
    totalAmount += i.price * i.qty;
    totalQty += i.qty;

    cartItems.innerHTML += `
      <div class="cart-item">
        ${i.name} x${i.qty}
        <div>
          <button class="qty-btn" onclick="chg(${i.id},-1)">−</button>
          <button class="qty-btn" onclick="chg(${i.id},1)">+</button>
        </div>
      </div>`;
  });

  totalAmountCache = totalAmount;   // 🔥 IMPORTANT
total.textContent = totalAmount.toFixed(2);


  totalQtyEl.textContent = totalQty;

   computeChange();
  updateNumpadState(); // 🔥 ENABLE / DISABLE NUMPAD
}



function chg(id, d){
  const i = cart.find(x => x.id === id);
  if(!i) return;

  const p = products.find(x => x.id === id);
  if(!p) return;

  // ➕ ADD
  if(d > 0){
    if(p.stock <= 0) return;
    i.qty++;
    p.stock--;
  }

  // ➖ MINUS
  if(d < 0){

  // 🔒 BLOCK BELOW UNPAID BASE QTY
  const base = unpaidBaseQty[i.id] || 0;

if(isResumedUnpaid && i.qty <= base){
  showAlert("❌ Cannot reduce below unpaid quantity");
  return;
}


  i.qty--;
  p.stock++;
}


  // ❌ REMOVE ITEM — ONLY IF NOT RESUMED UNPAID
  if(i.qty <= 0 && !isResumedUnpaid){
  cart = cart.filter(x => x.id !== id);
}


  renderCart();
  renderMenu();
}



/* =====================================================
   AUTO HIDE / SHOW ADMIN BUTTONS
===================================================== */
function updateRoleUI(){
  const isAdmin = currentRole === "admin";

  

  // DROPDOWN BUTTONS
  document
    .querySelectorAll("[data-admin]")
    .forEach(btn=>{
      btn.style.display = isAdmin ? "block" : "none";
    });

  // VOID BUTTONS SA SALES HISTORY
  document
    .querySelectorAll(".void-btn")
    .forEach(btn=>{
      btn.style.display = isAdmin ? "inline-block" : "none";
    });

}



/* =====================================================
   NUMPAD
===================================================== */
function num(n){
  if(cart.length === 0) return;

  if(cash === "0") cash = "";
  cash += n;

  if(+cash > 999999){
    cash = "999999";
  }

  cashEl.textContent = cash;
  computeChange();
}



function clearCash(){
  if(cart.length === 0) return; // 🔒 BLOCK

  cash = "0";
  cashEl.textContent = 0;
  computeChange();
}


function back(){
  if(cart.length === 0) return; // 🔒 BLOCK

  cash = cash.slice(0,-1);
  if(cash === "") cash = "0";
  cashEl.textContent = cash;
  computeChange();
}


function computeChange(){
  const c = Number(cash) || 0;
  change.textContent =
    c >= totalAmountCache
      ? c - totalAmountCache
      : 0;
}


function updateNumpadState(){
  const disabled = cart.length === 0;

  document
    .querySelectorAll(".numpad button")
    .forEach(btn=>{
      btn.disabled = disabled;
      btn.style.opacity = disabled ? .4 : 1;
    });
}


/* =====================================================
   CHECKOUT (AUTO RESET ROLE)
===================================================== */
function checkout(){

  const t = +total.textContent;

  if(cart.length === 0){
    playSound("error");
    showAlert("❌ No items");
    return;
  }

  openModal(`
  <div style="text-align:center">
    <h2>🧾 Checkout</h2>

    <p>
      <b>Total:</b> ₱${t.toFixed(2)}
    </p>

    <!-- 🔥 CUSTOMER NAME (UNPAID ONLY) -->
    <input
      id="customerNameInput"
      type="text"
      placeholder="Customer name (for UNPAID)"
      style="
        width:100%;
        padding:10px;
        margin:10px 0;
        font-size:16px;
      "
    >

    <div class="actions" style="gap:10px">
      <button class="save-btn" onclick="finalizeCheckout('paid')">
        ✅ PAID
      </button>

      <button class="close-btn" onclick="finalizeCheckout('unpaid')">
        ⏳ UNPAID
      </button>
    </div>

    <div style="margin-top:12px">
      <button
        class="close-btn"
        onclick="closeCheckout()"
        style="width:100%">
        ✖ CLOSE
      </button>
    </div>
  </div>
`);


}


function finalizeCheckout(status = "paid"){

  if(checkoutLocked) return;
  checkoutLocked = true;

  const unlock = () => checkoutLocked = false;

  const t = +total.textContent;
  const c = +cash;

  // ❌ NO ITEMS
  if(cart.length === 0){
    showAlert("❌ No items", unlock);
    return;
  }

  // ❌ CASH CHECK
  if(status === "paid" && c < t){
    showAlert("❌ Insufficient cash", unlock);
    return;
  }

  // ❌ UNPAID NAME REQUIRED
  let customerName = "";
  if(status === "unpaid"){
    const input = document.getElementById("customerNameInput");
    customerName = input?.value.trim() || "";

    if(!customerName){
      showAlert("❌ Customer name required for UNPAID", unlock);
      return;
    }
  }

  // 🔒 EXIT ADMIN MODE
  if(currentRole === "admin"){
    currentRole = "cashier";
    updateRoleUI();
  }

  // 🔥 SAVE STOCK
  products.forEach(p => saveProductDB(p));

  // 🔥 SAVE SALE
  const groupId = resumedUnpaidSale
    ? resumedUnpaidSale.orderGroupId
    : null;

  saveSaleFromCart(groupId, status, customerName);

  // 🔥 DELETE OLD UNPAID
  if(isResumedUnpaid && resumedUnpaidSale){
    db.transaction("sales","readwrite")
      .objectStore("sales")
      .delete(resumedUnpaidSale.id);
  }

  // 🔥 RESET
  resetOrder();
  lastCompletedOrderGroupId = null;
  unpaidBaseQty = {};
  resumedUnpaidSale = null;
  isResumedUnpaid = false;

  loadProducts();
  loadSales();

  playSound("success");

  showAlert(
    status === "paid"
      ? "✅ PAID ORDER COMPLETED"
      : "⏳ UNPAID ORDER SAVED",
    unlock
  );
}






const eodDate      = document.getElementById("eodDate");
const eodSummary   = document.getElementById("eodSummary");
const eodItems     = document.getElementById("eodItems");
const eodInventory = document.getElementById("eodInventory");



const expenseModal = document.getElementById("expenseModal");
const expenseList  = document.getElementById("expenseList");
const expAmount    = document.getElementById("expAmount");
const expDesc      = document.getElementById("expDesc");
const expDate      = document.getElementById("expDate");

/* OPEN MODAL */
function openExpenseModal(){
  expDate.value = getActiveDate();
  expenseModal.style.display = "flex";
  document.body.classList.add("modal-open");
  loadExpensesForDate(expDate.value);
}

/* CLOSE MODAL */
function closeExpenseModal(){
  expenseModal.style.display = "none";
  document.body.classList.remove("modal-open");
}

/* SAVE EXPENSE */
function saveExpense(){
  const amount = +expAmount.value;
  const desc   = expDesc.value.trim();
  const date   = expDate.value;

  if(!amount || amount <= 0){
    showAlert("❌ Invalid amount");
    return;
  }

  const tx = db.transaction("expenses","readwrite");
  const store = tx.objectStore("expenses");

  const req = store.add({
    id: Date.now(),
    amount,
    desc,
    date
  });

  req.onsuccess = () => {
    expAmount.value = "";
    expDesc.value = "";

    loadExpensesForDate(date);
    loadSales(); // refresh summary cards
    showAlert("✅ Expense added");
  };

  req.onerror = () => {
    showAlert("❌ Failed to save expense");
  };
}
function deleteExpense(id, date){
  if(currentRole !== "admin") return;

  showConfirm("Delete this expense?", ()=>{

    const tx = db.transaction("expenses", "readwrite");
    const store = tx.objectStore("expenses");

    store.delete(id);

    tx.oncomplete = () => {
      loadExpensesForDate(date); // refresh modal list
      loadSales();               // refresh summary cards
      showAlert("❌ Expense deleted");
    };

    tx.onerror = () => {
      showAlert("❌ Failed to delete expense");
    };
  });
}


/* LOAD EXPENSES */
function loadExpensesForDate(date){
  if(!db || !db.objectStoreNames.contains("expenses")){
    expenseList.innerHTML = "<small>Expenses not ready</small>";
    return;
  }

  expenseList.innerHTML = "<small>Loading...</small>";

  db.transaction("expenses")
    .objectStore("expenses")
    .getAll().onsuccess = e => {

      const list = (e.target.result || [])
        .filter(x => x.date === date)
        .sort((a,b)=>b.id-a.id);

      if(!list.length){
        expenseList.innerHTML = "<small>No expenses for this date</small>";
        return;
      }

      expenseList.innerHTML = "";

      list.forEach(x=>{
  expenseList.innerHTML += `
    <div class="sales-entry">
      <div>${x.desc || "—"}</div>

      <div style="display:flex;align-items:center;gap:8px;">
        <b>₱${x.amount.toFixed(2)}</b>

        <!-- ❌ ADMIN ONLY DELETE -->
        <button
          class="void-btn"
          data-admin
          onclick="deleteExpense(${x.id}, '${x.date}')">
          ✖
        </button>
      </div>
    </div>
  `;
});

    };
}

/* CHANGE DATE INSIDE MODAL */
expDate.addEventListener("change", ()=>{
  loadExpensesForDate(expDate.value);
});

/* =====================================================
   COMMISSION MODAL
===================================================== */
const commissionModal = document.getElementById("commissionModal");
const commissionList  = document.getElementById("commissionList");

function openCommissionModal(){
  if(currentRole !== "admin") return;

  commissionModal.style.display = "flex";
  document.body.classList.add("modal-open");

  loadCommissionDetails(); // ← step 4
}

function closeCommissionModal(){
  commissionModal.style.display = "none";
  document.body.classList.remove("modal-open");
}

function loadCommissionDetails(){
  if(!db) return;

  const d = getActiveDate();
  commissionList.innerHTML = "<small>Loading...</small>";

  db.transaction("sales")
    .objectStore("sales")
    .getAll().onsuccess = e => {

      const list = (e.target.result || [])
        .filter(s => s.dateOnly === d);

      if(!list.length){
        commissionList.innerHTML = "<small>No commission for this date</small>";
        return;
      }

      let totalCommission = 0;
      commissionList.innerHTML = "";

      list.forEach(s => {

        let orderCommission = 0;

        const itemsHTML = s.items.map(i=>{
          const itemComm = i.qty * (i.commission || 0);
          orderCommission += itemComm;
          return `
            <div style="font-size:13px">
              ${i.name} x${i.qty}
              <span style="float:right">₱${itemComm.toFixed(2)}</span>
            </div>
          `;
        }).join("");

        totalCommission += orderCommission;

        commissionList.innerHTML += `
          <div class="sales-entry">
            <div style="flex:1">
              <b>${s.date}</b>
              ${itemsHTML}
            </div>
            <div>
              <b>₱${orderCommission.toFixed(2)}</b>
            </div>
          </div>
        `;
      });

      // TOTAL SA TAAS
      commissionList.innerHTML =
        `<div style="
            font-weight:900;
            font-size:18px;
            text-align:center;
            margin-bottom:12px;
          ">
          TOTAL: ₱${totalCommission.toFixed(2)}
        </div>` + commissionList.innerHTML;
    };
    
}
function exportSalesByDate(date){
  if(!db){
    showAlert("❌ Database not ready");
    return;
  }

  db.transaction("sales")
    .objectStore("sales")
    .getAll().onsuccess = e => {

      const sales = (e.target.result || [])
        .filter(s => s.dateOnly === date);

      if(!sales.length){
        showAlert("ℹ️ No sales for this date");
        return;
      }

      const payload = {
        type: "POS_SALES_BY_DATE",
        date,
        device: getDeviceId(),
        exportedAt: new Date().toISOString(),
        sales
      };

      const blob = new Blob(
        [JSON.stringify(payload, null, 2)],
        { type:"application/json" }
      );

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sales-${date}.json`;
      a.click();

      showAlert(`✅ Sales exported (${date})`);
    };
}
function importSalesByDate(file){
  if(currentRole !== "admin"){
    showAlert("⛔ ADMIN ONLY");
    return;
  }

  const reader = new FileReader();

  reader.onload = e => {
    let data;

    try{
      data = JSON.parse(e.target.result);
    }catch{
      showAlert("❌ Invalid file");
      return;
    }

    if(
      data.type !== "POS_SALES_BY_DATE" ||
      !data.date ||
      !Array.isArray(data.sales)
    ){
      showAlert("❌ Invalid sales format");
      return;
    }

    askPin("🔐 Confirm ADMIN PIN", pin=>{
      if(!verifyPin(pin)){
        showAlert("❌ WRONG PIN");
        return;
      }

      const tx = db.transaction("sales","readwrite");
      const store = tx.objectStore("sales");

      let imported = 0;

      data.sales.forEach(s=>{
        store.get(s.id).onsuccess = e=>{
          if(!e.target.result){
            store.add(s);
            imported++;
          }
        };
      });

      tx.oncomplete = ()=>{
        loadSales();
        showAlert(
          `✅ Imported ${imported} sales\n📅 Date: ${data.date}`
        );
      };
    });
  };

  reader.readAsText(file);
}
document
  .getElementById("importSalesInput")
  .addEventListener("change", e=>{
    const file = e.target.files[0];
    if(file) importSalesByDate(file);
    e.target.value = "";
  });


/* =====================================================
   UI (FIXED & SAFE)
===================================================== */
const hamburger = document.getElementById("hamburger");
const dropdown  = document.getElementById("dropdown");

/* 🍔 Hamburger toggle */
hamburger.addEventListener("click", e=>{
  e.stopPropagation();
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
});

/* 🌍 GLOBAL CLICK — close menus only */
document.addEventListener("click", e=>{

  // close hamburger dropdown
  if(!e.target.closest("#hamburger") && !e.target.closest("#dropdown")){
    dropdown.style.display = "none";
  }

});


function toggleDark(){
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("pos_darkmode", isDark ? "on" : "off");
}

salesDate.addEventListener("change",loadSales);

const total = document.getElementById("total"),
      totalQtyEl = document.getElementById("totalQty"),
      cashEl = document.getElementById("cash"),
      change = document.getElementById("change");

/* 💸 SALES SUMMARY – EXPENSES & PROFIT */
const expensesTodayEl = document.getElementById("expensesToday");


/* =====================================================
   DARK MODE PERSIST
===================================================== */
(function(){
  if(localStorage.getItem("pos_darkmode") === "on"){
    document.body.classList.add("dark");
  }
})();
/* =====================================================
   SET TODAY DATE SA CALENDAR (PH TIME)
===================================================== */
(function setTodayCalendar(){
  const today = getTodayPH();
  salesDate.value = today;
  
})();

updateNumpadState();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {

    navigator.serviceWorker.register("/art-posko/service-worker.js");

    document.addEventListener("pointerdown", e=>{
  const btn = e.target.closest("button");
  if(!btn || btn.disabled) return;
  playSound("tap");
  haptic(15);
});

  });
}


// 🔒 HARD BLOCK DOUBLE TAP ZOOM (MOBILE)
let lastTap = 0;

document.addEventListener("touchend", e => {
  const now = Date.now();
  if (now - lastTap < 300) {
    // ❌ wag preventDefault sa iOS
    if(!IS_IOS){
      e.preventDefault();
    }
  }
  lastTap = now;
}, { passive:false });

/* =====================================================
   DEVICE DETECT
===================================================== */
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

/* =====================================================
   ZERO-DELAY SOUND ENGINE
===================================================== */
const SOUND_SRC = {
  tap: "/art-posko/sounds/tap.mp3",
  click: "/art-posko/sounds/click.mp3",
  success: "/art-posko/sounds/success.mp3",
  error: "/art-posko/sounds/error.mp3"
};

const SND = {};
const SND_POOL = {};

Object.keys(SOUND_SRC).forEach(key=>{
  const a = new Audio(SOUND_SRC[key]);
  a.preload = "auto";
  a.volume = 0.7;
  SND[key] = a;

  // 🔥 pool for instant replay
  SND_POOL[key] = [
    a,
    a.cloneNode(),
    a.cloneNode()
  ];
});

function playSound(type){
  if(IS_IOS) return; // 🍎 iOS = SILENT MODE

  const pool = SND_POOL[type];
  if(!pool) return;

  for(const a of pool){
    if(a.paused){
      a.currentTime = 0;
      a.play().catch(()=>{});
      break;
    }
  }
}


/* =====================================================
   AUDIO UNLOCK (ZERO FIRST-TAP DELAY)
===================================================== */
document.addEventListener("click", function unlockAudio(){
  if(IS_IOS) return; // 🍎 iOS skip unlock

  Object.values(SND).forEach(a=>{
    a.play().then(()=>a.pause()).catch(()=>{});
  });

  document.removeEventListener("click", unlockAudio);
},{ once:true });



