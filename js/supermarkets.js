// supermarkets.js — renders store list & store pages (uses store.js + api)
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("supermarketGrid");
  const supermarketListSection = document.getElementById("supermarketListSection");
  const storeView = document.getElementById("store-view");
  const storeTitleEl = document.getElementById("storeTitle");
  const productGrid = document.getElementById("productGrid");
  const categorySelect = document.getElementById("categorySelect");
  const storeSearch = document.getElementById("storeSearch");
  const backToStoresBtn = document.getElementById("backToStores");

  const cartItemsEl = document.getElementById("cartItems");
  const cartSubtotalEl = document.getElementById("cartSubtotal");
  const checkoutOpenBtn = document.getElementById("checkoutOpenBtn");
  const checkoutModal = document.getElementById("checkoutModal");
  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutSummary = document.getElementById("checkoutSummary");
  const checkoutSuccess = document.getElementById("checkoutSuccess");
  const checkoutCloseBtn = document.getElementById("checkoutCloseBtn");

  let productsData = {};
  let currentStoreKey = null;
  let currentCategory = "All";
  let cart = [];

  const fmt = n => Number(n).toFixed(2);
  const calcTotal = () => cart.reduce((s, it) => s + it.price * it.qty, 0);
  const findIdx = id => cart.findIndex(it => it.id === id);

  // fast initial render: use cached products or fetch
  try {
    const res = await store.loadAll();
    productsData = res.data || {};
  } catch (err) {
    console.error("Could not load products:", err);
    productsData = {};
  }

  // render store cards
  function renderStores() {
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    const keys = Object.keys(productsData);
    if (!keys.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No partner supermarkets found.";
      grid.appendChild(empty);
      return;
    }
    keys.forEach(key => {
      const card = document.createElement("div");
      card.className = "supermarket-card";
      card.dataset.store = key;
      const img = document.createElement("img");
      img.src = `images/stores/${key}.jpg`;
      img.alt = key;
      img.loading = "lazy";
      img.onerror = () => img.src = "images/placeholder.png";
      const h4 = document.createElement("h4");
      h4.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      card.appendChild(img);
      card.appendChild(h4);
      frag.appendChild(card);
      card.addEventListener("click", () => openStore(key, h4.textContent));
    });
    grid.appendChild(frag);
  }

  function renderCategories(storeKey) {
    const cats = Object.keys(productsData[storeKey] || {});
    categorySelect.innerHTML = `<option value="All">All</option>` + cats.map(c => `<option>${c}</option>`).join("");
    currentCategory = "All";
  }

  function renderProducts(query = "") {
    if (!currentStoreKey) return;
    const allCats = productsData[currentStoreKey] || {};
    let all = [];
    if (currentCategory === "All") Object.values(allCats).forEach(a => all.push(...a));
    else all = allCats[currentCategory] || [];
    const q = (query || "").toLowerCase();
    const filtered = all.filter(p => p.name.toLowerCase().includes(q));
    productGrid.innerHTML = "";
    if (!filtered.length) { productGrid.innerHTML = `<div style="padding:18px;color:var(--muted)">No products found</div>`; return; }
    const frag = document.createDocumentFragment();
    filtered.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `<img src="${p.image || 'images/placeholder.png'}" loading="lazy"><h4>${p.name}</h4><p>GHS ${fmt(p.price)}</p><button class="add-btn" data-id="${p.id}">Add to Cart</button>`;
      frag.appendChild(card);
    });
    productGrid.appendChild(frag);
  }

  function openStore(key, title) {
    currentStoreKey = key;
    storeTitleEl.textContent = title;
    supermarketListSection.classList.add("hidden");
    storeView.classList.remove("hidden");
    renderCategories(key);
    renderProducts("");
    cart = [];
    renderCart();
    if (storeSearch) storeSearch.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  backToStoresBtn?.addEventListener("click", () => {
    storeView.classList.add("hidden");
    supermarketListSection.classList.remove("hidden");
    currentStoreKey = null;
    cart = [];
    renderCart();
  });

  // product add
  productGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    const all = Object.values(productsData[currentStoreKey] || {}).flat();
    const prod = all.find(x => x.id === id);
    if (!prod) return;
    const idx = findIdx(id);
    if (idx === -1) cart.push({ ...prod, qty: 1 });
    else cart[idx].qty += 1;
    renderCart();
    showToast("Added to cart");
  });

  function renderCart() {
    cartItemsEl.innerHTML = "";
    if (!cart.length) { cartItemsEl.innerHTML = "<li style='padding:10px;color:var(--muted)'>Cart is empty</li>"; }
    else {
      cart.forEach(item => {
        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML = `<div><div style="font-weight:700">${item.name}</div><small>GHS ${fmt(item.price)} × ${item.qty}</small></div><div class="qty-controls"><button class="qty-btn" data-action="dec" data-id="${item.id}">−</button><div style="min-width:22px;text-align:center">${item.qty}</div><button class="qty-btn" data-action="inc" data-id="${item.id}">＋</button><button class="qty-btn" data-action="rm" data-id="${item.id}" style="color:var(--primary);border:none;background:none">✖</button></div>`;
        cartItemsEl.appendChild(li);
      });
    }
    cartSubtotalEl.textContent = `Total: GHS ${fmt(calcTotal())}`;
  }

  cartItemsEl?.addEventListener("click", e => {
    const dec = e.target.closest('.qty-btn[data-action="dec"]');
    const inc = e.target.closest('.qty-btn[data-action="inc"]');
    const rm = e.target.closest('.qty-btn[data-action="rm"]');
    if (dec) { const i = findIdx(dec.dataset.id); if (i!==-1) { cart[i].qty = Math.max(1, cart[i].qty-1); renderCart(); } }
    if (inc) { const i = findIdx(inc.dataset.id); if (i!==-1) { cart[i].qty += 1; renderCart(); } }
    if (rm) { cart = cart.filter(it => it.id !== rm.dataset.id); renderCart(); }
  });

  // category change, search
  categorySelect?.addEventListener("change", (e) => { currentCategory = e.target.value; renderProducts(storeSearch?.value || ""); });
  storeSearch?.addEventListener("input", (e) => renderProducts(e.target.value));

  // checkout modal
  checkoutOpenBtn?.addEventListener("click", () => {
    if (!cart.length) { alert("Your cart is empty"); return; }
    checkoutSummary.textContent = `You are ordering ${cart.length} item(s). Total: GHS ${fmt(calcTotal())}`;
    checkoutModal?.classList.remove("hidden");
    checkoutForm?.classList.remove("hidden");
    checkoutSuccess?.classList.add("hidden");
  });

  checkoutForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = checkoutForm.querySelector("#fullName")?.value.trim();
    const phone = checkoutForm.querySelector("#phone")?.value.trim();
    const address = checkoutForm.querySelector("#deliveryAddress")?.value.trim();
    if (!fullName || !phone || !address) { alert("Please fill in Name, Phone, and Address."); return; }

    const orderPayload = {
      name: fullName,
      phone,
      email: checkoutForm.querySelector("#email")?.value || "",
      address,
      supermarket: currentStoreKey || "",
      orderType: "Supermarket",
      items: cart.map(it => `${it.name} (x${it.qty})`).join(", "),
      total: `GHS ${fmt(calcTotal())}`,
      notes: checkoutForm.querySelector("#notes")?.value || ""
    };

    // send via api — fast optimistic success
    await api.sendOrder(orderPayload);
    checkoutForm.classList.add("hidden");
    checkoutSuccess?.classList.remove("hidden");
    cart = [];
    renderCart();
  });

  checkoutCloseBtn?.addEventListener("click", () => checkoutModal?.classList.add("hidden"));
  checkoutModal?.addEventListener("click", e => { if (e.target === checkoutModal) checkoutModal.classList.add("hidden"); });

  // initial render
  renderStores();
});
