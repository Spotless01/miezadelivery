// ================================
// Mieza — Unified JS (Green & Cream)
// - Jumia form
// - Supermarkets (store selection, search, categories)
// - Cart with qty & auto-sum + checkout modal
// ================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Mieza UI ready");

  // 🔗 Google Apps Script endpoint
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxPguXexbJAnlqI9RKN64pHk0S7ISzZRMWH-Q91oVFjQgdxBQCe-qHW6oQIWr5BIyxq/exec";

  // Send order/booking to Google Sheets
  async function sendToGoogleSheet(orderData) {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      console.log("✅ Order sent to Google Sheets:", orderData);
    } catch (err) {
      console.error("❌ Failed to send order:", err);
    }
  }

  /* ---------- JUMIA booking ---------- */
  const jumiaForm = document.getElementById("jumiaForm");
  const confirmationMessage = document.getElementById("confirmationMessage");
  if (jumiaForm) {
    jumiaForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const orderData = {
        name: jumiaForm.querySelector("#name")?.value || "",
        phone: jumiaForm.querySelector("#phone")?.value || "",
        email: jumiaForm.querySelector("#email")?.value || "",
        address: jumiaForm.querySelector("#address")?.value || "",
        orderNumbers: jumiaForm.querySelector("#orderNumbers")?.value || "", // new field
        supermarket: "Jumia", // Jumia delivery
        orderType: "Jumia Delivery",
        items: "Jumia Parcel Pickup",
        total: "N/A",
        notes: jumiaForm.querySelector("#notes")?.value || "",
      };

      await sendToGoogleSheet(orderData);

      jumiaForm.classList.add("hidden");
      if (confirmationMessage) confirmationMessage.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Supermarket & Store Logic ---------- */
  const supermarketCards = document.querySelectorAll(".supermarket-card");
  const supermarketListSection = document.getElementById("supermarketListSection");
  const storeView = document.getElementById("store-view");
  const storeTitleEl = document.getElementById("storeTitle");
  const productGrid = document.getElementById("productGrid");
  const storeSearch = document.getElementById("storeSearch");
  const backToStoresBtn = document.getElementById("backToStores");

  const checkoutOpenBtn = document.getElementById("checkoutOpenBtn");
  const checkoutModal = document.getElementById("checkoutModal");
  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutSummary = document.getElementById("checkoutSummary");
  const checkoutSuccess = document.getElementById("checkoutSuccess");
  const checkoutCloseBtn = document.getElementById("checkoutCloseBtn");

  const cartItemsEl = document.getElementById("cartItems");
  const cartSubtotalEl = document.getElementById("cartSubtotal");

  let cart = [];
  let currentStoreKey = null;
  let currentCategory = null;

  const fmt = n => Number(n).toFixed(2);
  const calcTotal = () => cart.reduce((s, it) => s + it.price * it.qty, 0);
  const findIdx = id => cart.findIndex(it => it.id === id);

  /* ---------- Category Dropdown ---------- */
  const categorySelect = document.createElement("select");
  categorySelect.id = "categorySelect";
  categorySelect.style.marginTop = "12px";
  categorySelect.style.padding = "6px";
  categorySelect.style.fontSize = "1rem";
  categorySelect.style.width = "100%";
  document.querySelector(".store-tools").after(categorySelect);

  /* ---------- Supermarket Product Data ---------- */
  const supermarketProducts = {
    citymall: { Groceries: [ { id: "city-1", name: "Golden Tree Chocolate (250g)", price: 15.0, image: "images/products/city/chocolate.jpg" }, { id: "city-2", name: "Voltic Water (1.5L)", price: 5.0, image: "images/products/city/water.jpg" }, { id: "city-3", name: "Indomie Noodles (Pack)", price: 3.5, image: "images/products/city/indomie.jpg" }], Meats: [ { id: "city-4", name: "Fresh Chicken (1kg)", price: 40.0, image: "images/products/city/chicken.jpg" } ] },
    chinamall: { Electronics: [ { id: "china-2", name: "Bluetooth Speaker", price: 80.0, image: "images/products/china/speaker.jpg" }, { id: "china-3", name: "LED Smart Bulb", price: 60.0, image: "images/products/china/bulb.jpg" } ], Homeware: [ { id: "china-1", name: "Ceramic Dinner Set (12pc)", price: 120.0, image: "images/products/china/dinner-set.jpg" } ] },
    melcom: { Appliances: [ { id: "melcom-1", name: "Rice Cooker", price: 150.0, image: "images/products/melcom/ricecooker.jpg" } ], Essentials: [ { id: "melcom-2", name: "Cooking Oil (5L)", price: 95.0, image: "images/products/melcom/oil.jpg" }, { id: "melcom-3", name: "Sunlight Detergent (2kg)", price: 25.0, image: "images/products/melcom/detergent.jpg" } ] },
    shoprite: { Dairy: [ { id: "shop-1", name: "Fresh Milk (2L)", price: 12.0, image: "images/products/shoprite/milk.jpg" } ], Bakery: [ { id: "shop-2", name: "Bread Loaf", price: 10.0, image: "images/products/shoprite/bread.jpg" } ], Fruits: [ { id: "shop-3", name: "Bananas (1kg)", price: 8.0, image: "images/products/shoprite/bananas.jpg" } ] },
    maxmart: { Breakfast: [ { id: "max-1", name: "Corn Flakes (500g)", price: 28.0, image: "images/products/maxmart/cornflakes.jpg" } ], Groceries: [ { id: "max-2", name: "Tomato Paste (Pack)", price: 15.0, image: "images/products/maxmart/tomato.jpg" } ], Beverages: [ { id: "max-3", name: "Bottled Juice (1L)", price: 18.0, image: "images/products/maxmart/juice.jpg" } ] },
  };

  /* ---------- Render Categories & Products ---------- */
  function renderCategories(storeKey) {
    if (!storeKey || !supermarketProducts[storeKey]) return;
    const categories = Object.keys(supermarketProducts[storeKey]);
    categorySelect.innerHTML = `<option value="All">All</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join("");
    currentCategory = "All";
  }

  function renderStoreProducts(query = "") {
    if (!productGrid || !currentStoreKey) return;
    const allCats = supermarketProducts[currentStoreKey];
    let allProducts = [];
    if (currentCategory === "All") {
      Object.values(allCats).forEach(catArr => allProducts.push(...catArr));
    } else {
      allProducts = allCats[currentCategory] || [];
    }

    const q = query.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q));

    if (filtered.length === 0) {
      productGrid.innerHTML = `<div style="grid-column:1/-1;padding:18px;color:var(--muted)">No products found</div>`;
      return;
    }

    productGrid.innerHTML = filtered.map(p => `
      <div class="product-card fade-up">
        <img src="${p.image}" alt="${p.name}" onerror="this.src='images/placeholder.png'">
        <h4>${p.name}</h4>
        <p>GHS ${fmt(p.price)}</p>
        <button class="add-btn" data-id="${p.id}">Add to Cart</button>
      </div>
    `).join("");
  }

  categorySelect.addEventListener("change", e => {
    currentCategory = e.target.value;
    renderStoreProducts(storeSearch.value);
  });

  supermarketCards.forEach(card => {
    card.addEventListener("click", () => {
      const storeKey = card.dataset.store;
      if (!storeKey || !supermarketProducts[storeKey]) return;

      currentStoreKey = storeKey;
      storeTitleEl.textContent = card.querySelector("h4").textContent;
      supermarketListSection.classList.add("hidden");
      storeView.classList.remove("hidden");

      renderCategories(storeKey);
      renderStoreProducts("");
      renderCart();

      if (storeSearch) storeSearch.value = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ---------- Cart Logic ---------- */
  function renderCart() {
    if (!cartItemsEl || !cartSubtotalEl) return;
    cartItemsEl.innerHTML = "";
    if (cart.length === 0) {
      cartItemsEl.innerHTML = "<li style='padding:10px;color:var(--muted)'>Cart is empty</li>";
    } else {
      cart.forEach(item => {
        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML = `
          <div>
            <div style="font-weight:700">${item.name}</div>
            <small>GHS ${fmt(item.price)} × ${item.qty}</small>
          </div>
          <div class="qty-controls">
            <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
            <div style="min-width:22px;text-align:center">${item.qty}</div>
            <button class="qty-btn" data-action="inc" data-id="${item.id}">＋</button>
            <button class="qty-btn" data-action="rm" data-id="${item.id}" style="color:var(--primary);border:none;background:none">✖</button>
          </div>
        `;
        cartItemsEl.appendChild(li);
      });
    }
    cartSubtotalEl.textContent = `Total: GHS ${fmt(calcTotal())}`;
  }

  function addToCart(product) {
    const idx = findIdx(product.id);
    if (idx === -1) cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    else cart[idx].qty += 1;
    renderCart();
  }

  productGrid?.addEventListener("click", e => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;
    const pid = btn.dataset.id;
    const prod = (currentCategory === "All" ? Object.values(supermarketProducts[currentStoreKey]).flat() : supermarketProducts[currentStoreKey][currentCategory]).find(p => p.id === pid);
    if (prod) {
      addToCart(prod);
      btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.98)' }, { transform: 'scale(1)' }], { duration: 160 });
    }
  });

  cartItemsEl?.addEventListener("click", e => {
    const dec = e.target.closest('.qty-btn[data-action="dec"]');
    const inc = e.target.closest('.qty-btn[data-action="inc"]');
    const rm = e.target.closest('.qty-btn[data-action="rm"]');
    if (dec) { const i = findIdx(dec.dataset.id); if (i!==-1){ cart[i].qty=Math.max(1,cart[i].qty-1); renderCart(); } }
    if (inc) { const i = findIdx(inc.dataset.id); if (i!==-1){ cart[i].qty+=1; renderCart(); } }
    if (rm) { cart = cart.filter(it => it.id!==rm.dataset.id); renderCart(); }
  });

  backToStoresBtn?.addEventListener("click", () => {
    storeView.classList.add("hidden");
    supermarketListSection.classList.remove("hidden");
    cart = [];
    renderCart();
  });

  storeSearch?.addEventListener("input", e => renderStoreProducts(e.target.value));

  /* ---------- Checkout ---------- */
  checkoutOpenBtn?.addEventListener("click", () => {
    if (cart.length===0){ alert("Your cart is empty"); return; }
    checkoutSummary.textContent = `You are ordering ${cart.length} item(s). Total: GHS ${fmt(calcTotal())}`;
    checkoutModal?.classList.remove("hidden");
    checkoutForm?.classList.remove("hidden");
    checkoutSuccess?.classList.add("hidden");
  });

  checkoutForm?.addEventListener("submit", async e => {
    e.preventDefault();

    const fullName = checkoutForm.querySelector("#fullName")?.value.trim();
    const phone = checkoutForm.querySelector("#phone")?.value.trim();
    const address = checkoutForm.querySelector("#deliveryAddress")?.value.trim();
    const orderNumbers = checkoutForm.querySelector("#orderNumbers")?.value.trim();

    if (!fullName || !phone || !address) { alert("Please fill in Name, Phone, and Address."); return; }

    const total = fmt(calcTotal());
    const orderData = {
      name: fullName,
      phone,
      email: checkoutForm.querySelector("#email")?.value || "",
      address,
      orderNumbers,
      supermarket: currentStoreKey || "",
      orderType: "Supermarket",
      items: cart.map(it => `${it.name} (x${it.qty})`).join(", "),
      total: `GHS ${total}`,
      notes: checkoutForm.querySelector("#notes")?.value || ""
    };

    await sendToGoogleSheet(orderData);

    checkoutForm.classList.add("hidden");
    checkoutSuccess?.classList.remove("hidden");
    cart = [];
    renderCart();
  });

  checkoutCloseBtn?.addEventListener("click", () => { checkoutModal?.classList.add("hidden"); });
  checkoutModal?.addEventListener("click", e => { if(e.target===checkoutModal) checkoutModal.classList.add("hidden"); });

  /* ---------- Navbar Hamburger ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  const navbar = document.querySelector(".navbar");
  const navLinks = document.querySelectorAll(".nav-links a");

  navToggle?.addEventListener("click", () => {
    const isExpanded = navToggle.classList.toggle("active");
    navToggle.setAttribute("aria-expanded", isExpanded);
    navbar.classList.toggle("open");
  });

  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      navbar.classList.remove("open");
      navToggle.classList.remove("active");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  renderCart();
});
