// Minimal admin UI to manage data/products.json (client-side only)
// - Load data/products.json (if available)
// - Add / edit / delete stores, categories, products
// - Download JSON or copy to clipboard
// - Upload JSON file to replace current data
document.addEventListener("DOMContentLoaded", () => {
  const REMOTE_JSON = "data/products.json";

  // DOM
  const storesList = document.getElementById("storesList");
  const categoriesList = document.getElementById("categoriesList");
  const productsList = document.getElementById("productsList");
  const jsonPreview = document.getElementById("jsonPreview");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const uploadInput = document.getElementById("uploadInput");
  const addStoreBtn = document.getElementById("addStoreBtn");
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const newCategoryInput = document.getElementById("newCategoryInput");
  const addProductBtn = document.getElementById("addProductBtn");
  const resetBtn = document.getElementById("resetBtn");

  let data = {}; // in-memory product data
  let currentStore = null;
  let currentCategory = null;

  // Utility
  const safeJSON = obj => JSON.stringify(obj, null, 2);
  const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2,9);

  // Load remote products.json
  async function loadRemote() {
    try {
      const r = await fetch(REMOTE_JSON, { cache: "no-store" });
      if (!r.ok) throw new Error("Not found");
      data = await r.json();
      if (!data || typeof data !== "object") data = {};
    } catch (err) {
      console.warn("Could not load remote products.json, starting with empty dataset.", err);
      data = {};
    }
    renderAll();
  }

  function renderAll() {
    renderStores();
    renderPreview();
    renderCategories();
    renderProducts();
  }

  function renderStores() {
    storesList.innerHTML = "";
    const keys = Object.keys(data);
    if (keys.length === 0) {
      storesList.innerHTML = "<div class='muted'>No stores yet</div>";
      return;
    }
    keys.forEach(key => {
      const el = document.createElement("div");
      el.className = "store-item" + (key === currentStore ? " active" : "");
      el.innerHTML = `
        <div style="flex:1;min-width:0">
          <input class="inline store-name" data-key="${key}" value="${key}" />
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm edit-key" data-key="${key}" title="Rename key">Rename</button>
          <button class="btn btn-outline btn-sm del-store" data-key="${key}" title="Delete">Delete</button>
        </div>
      `;
      storesList.appendChild(el);

      // click selects store (when clicking the input)
      const input = el.querySelector(".store-name");
      input.addEventListener("focus", () => {
        currentStore = key;
        currentCategory = null;
        renderAll();
      });
    });

    // add inline creation input at bottom
    const inputWrap = document.createElement("div");
    inputWrap.style.marginTop = "8px";
    inputWrap.innerHTML = `
      <input id="newStoreInput" class="inline" placeholder="new-store-key (no spaces)" />
      <div style="margin-top:8px;display:flex;gap:8px">
        <button id="createStoreBtn" class="btn btn-primary btn-sm">Create Store</button>
      </div>
    `;
    storesList.appendChild(inputWrap);

    document.getElementById("createStoreBtn").addEventListener("click", () => {
      const v = document.getElementById("newStoreInput").value.trim();
      if (!v) return alert("Enter store key");
      if (data[v]) return alert("Store key already exists");
      data[v] = {};
      currentStore = v;
      currentCategory = null;
      document.getElementById("newStoreInput").value = "";
      renderAll();
    });

    // attach rename & delete handlers
    storesList.querySelectorAll(".edit-key").forEach(btn => {
      btn.addEventListener("click", () => {
        const oldKey = btn.dataset.key;
        const newKey = prompt("Rename store key (no spaces)", oldKey);
        if (!newKey || newKey.trim() === "" || newKey === oldKey) return;
        if (data[newKey]) return alert("Key already exists");
        data[newKey] = data[oldKey];
        delete data[oldKey];
        if (currentStore === oldKey) currentStore = newKey;
        renderAll();
      });
    });
    storesList.querySelectorAll(".del-store").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        if (!confirm(`Delete store "${key}" and all its categories/products?`)) return;
        delete data[key];
        if (currentStore === key) { currentStore = null; currentCategory = null; }
        renderAll();
      });
    });
  }

  function renderCategories() {
    categoriesList.innerHTML = "";
    if (!currentStore || !data[currentStore]) {
      categoriesList.innerHTML = `<div class="muted">Select a store to view categories.</div>`;
      return;
    }
    const cats = Object.keys(data[currentStore] || {});
    if (cats.length === 0) categoriesList.innerHTML = "<div class='muted'>No categories yet</div>";
    cats.forEach(cat => {
      const el = document.createElement("div");
      el.className = "category-item";
      el.innerHTML = `
        <div style="flex:1;min-width:0">
          <input class="inline category-name" data-cat="${cat}" value="${cat}" />
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm rename-cat" data-cat="${cat}">Rename</button>
          <button class="btn btn-outline btn-sm del-cat" data-cat="${cat}">Delete</button>
        </div>
      `;
      el.addEventListener("click", () => {
        currentCategory = cat;
        renderProducts();
      });
      categoriesList.appendChild(el);
    });

    newCategoryInput.value = "";
    addCategoryBtn.onclick = () => {
      const name = newCategoryInput.value.trim();
      if (!name) return alert("Enter category name");
      if (!data[currentStore]) data[currentStore] = {};
      if (data[currentStore][name]) return alert("Category exists");
      data[currentStore][name] = [];
      currentCategory = name;
      renderAll();
    };

    categoriesList.querySelectorAll(".rename-cat").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const cat = btn.dataset.cat;
        const n = prompt("New category name", cat);
        if (!n || n === cat) return;
        if (data[currentStore][n]) return alert("Category exists");
        data[currentStore][n] = data[currentStore][cat];
        delete data[currentStore][cat];
        if (currentCategory === cat) currentCategory = n;
        renderAll();
      });
    });
    categoriesList.querySelectorAll(".del-cat").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const cat = btn.dataset.cat;
        if (!confirm(`Delete category "${cat}"?`)) return;
        delete data[currentStore][cat];
        if (currentCategory === cat) currentCategory = null;
        renderAll();
      });
    });
  }

  function renderProducts() {
    productsList.innerHTML = "";
    if (!currentStore || !data[currentStore]) {
      productsList.innerHTML = `<div class="muted">Select a store and category to view products</div>`;
      return;
    }
    if (!currentCategory || !data[currentStore][currentCategory]) {
      productsList.innerHTML = `<div class="muted">Select a category to view products</div>`;
      return;
    }
    const arr = data[currentStore][currentCategory] || [];
    if (arr.length === 0) productsList.innerHTML = "<div class='muted'>No products</div>";

    arr.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "product-row";
      row.innerHTML = `
        <input class="prod-name" value="${escapeHtml(p.name || "")}" data-idx="${idx}" />
        <input class="prod-price" value="${p.price != null ? p.price : ""}" data-idx="${idx}" />
        <input class="prod-image" value="${escapeHtml(p.image || "")}" data-idx="${idx}" />
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm save-prod" data-idx="${idx}">Save</button>
          <button class="btn btn-outline btn-sm del-prod" data-idx="${idx}">Del</button>
        </div>
      `;
      productsList.appendChild(row);

      row.querySelectorAll(".save-prod").forEach(btn => {
        btn.addEventListener("click", () => {
          const i = Number(btn.dataset.idx);
          const inputs = row.querySelectorAll("input");
          const name = inputs[0].value.trim();
          const price = parseFloat(inputs[1].value) || 0;
          const image = inputs[2].value.trim();
          if (!name) return alert("Product name required");
          data[currentStore][currentCategory][i].name = name;
          data[currentStore][currentCategory][i].price = price;
          data[currentStore][currentCategory][i].image = image;
          renderAll();
        });
      });
      row.querySelectorAll(".del-prod").forEach(btn => {
        btn.addEventListener("click", () => {
          const i = Number(btn.dataset.idx);
          if (!confirm("Delete product?")) return;
          data[currentStore][currentCategory].splice(i, 1);
          renderAll();
        });
      });
    });
  }

  // Top-level actions
  addStoreBtn.onclick = () => {
    const key = prompt("Enter store key (used as identifier, no spaces)", "new-store");
    if (!key) return;
    if (data[key]) return alert("Store exists");
    data[key] = {};
    currentStore = key;
    currentCategory = null;
    renderAll();
  };

  addProductBtn.onclick = () => {
    if (!currentStore || !currentCategory) return alert("Select store and category first");
    const newProd = { id: uid(currentStore.slice(0,3) + "-"), name: "New Product", price: 0, image: "" };
    data[currentStore][currentCategory].push(newProd);
    renderAll();
    // scroll to bottom
    productsList.scrollTop = productsList.scrollHeight;
  };

  // Download JSON
  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([safeJSON(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Copy JSON
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(safeJSON(data));
      alert("JSON copied to clipboard");
    } catch (err) {
      alert("Copy failed — your browser may block clipboard writes");
    }
  });

  // Upload JSON file (replace)
  uploadInput.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const parsed = JSON.parse(txt);
      if (!confirm("Replace current dataset with uploaded JSON?")) return;
      data = parsed;
      currentStore = null;
      currentCategory = null;
      renderAll();
      uploadInput.value = "";
    } catch (err) {
      alert("Invalid JSON file");
    }
  });

  // Reset (reload remote)
  resetBtn.addEventListener("click", () => {
    if (!confirm("Reload from server (discard unsaved changes)?")) return;
    loadRemote();
  });

  function renderPreview() {
    jsonPreview.textContent = safeJSON(data);
  }

  // escape helper
  function escapeHtml(str) {
    return String(str).replace(/"/g, "&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // initial load
  loadRemote();
});
