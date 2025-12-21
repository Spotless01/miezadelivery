// Retailers page logic — handles bulk form and whatsapp quick-send
document.addEventListener("DOMContentLoaded", () => {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxPguXexbJAnlqI9RKN64pHk0S7ISzZRMWH-Q91oVFjQgdxBQCe-qHW6oQIWr5BIyxq/exec";

  function sendToGoogleSheet(orderData) {
    // We use no-cors same as other code for the same endpoint
    return fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    }).then(() => {
      console.log("Bulk request posted:", orderData);
    }).catch(err => {
      console.error("Bulk request failed:", err);
    });
  }

  const form = document.getElementById("retailerBulkForm");
  const fileInput = document.getElementById("retailerFile");
  const textarea = document.getElementById("retailerItems");
  const waBtn = document.getElementById("waQuickSend");
  const waChatBtn = document.getElementById("waChatBtn");
  const confirmation = document.getElementById("retailerConfirmation");

  function parseCSVText(text) {
    // very simple CSV parser: splits lines, trims, expects item,qty,notes optional
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items = lines.map(l => {
      const parts = l.split(",").map(p => p.trim());
      return {
        item: parts[0] || "",
        qty: parts[1] || "",
        notes: parts.slice(2).join(",") || ""
      };
    });
    return items;
  }

  async function buildItemsFromInput() {
    // prefer uploaded file if present, otherwise textarea
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const text = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = () => rej(reader.error);
        reader.readAsText(file);
      });
      return parseCSVText(text);
    } else {
      return parseCSVText(textarea.value || "");
    }
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const business = document.getElementById("retailerName")?.value.trim();
    const contact = document.getElementById("retailerContact")?.value.trim();
    const phone = document.getElementById("retailerPhone")?.value.trim();
    const email = document.getElementById("retailerEmail")?.value.trim();
    const location = document.getElementById("retailerLocation")?.value.trim();

    if (!business || !contact || !phone || !location) {
      alert("Please fill Business name, Contact, Phone and Delivery Location.");
      return;
    }

    const itemsArr = await buildItemsFromInput();
    if (!itemsArr || itemsArr.length === 0) {
      alert("Please provide at least one item in the list or upload a CSV.");
      return;
    }

    const itemsText = itemsArr.map(it => `${it.item}${it.qty ? " (x"+it.qty+")" : ""}${it.notes ? " — "+it.notes : ""}`).join("; ");

    const orderData = {
      name: business,
      contactPerson: contact,
      phone,
      email,
      address: location,
      supermarket: "Bulk-Retail",
      orderType: "Retailer Bulk Order",
      items: itemsText,
      total: "TBD",
      notes: `Bulk request uploaded via retailers page. ${itemsArr.length} lines`
    };

    // send to Google Sheet
    await sendToGoogleSheet(orderData);

    // UI success
    form.classList.add("hidden");
    if (confirmation) confirmation.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // WhatsApp quick send — create a short prefilled message using textarea or file
  waBtn?.addEventListener("click", async () => {
    const business = document.getElementById("retailerName")?.value.trim() || "Retailer";
    const phone = document.getElementById("retailerPhone")?.value.trim() || "";
    const location = document.getElementById("retailerLocation")?.value.trim() || "";
    const itemsArr = await buildItemsFromInput();
    const firstItems = itemsArr.slice(0, 8).map(it => `${it.item}${it.qty ? " x"+it.qty : ""}`).join(", ");
    const text = `Hello Mieza, I am ${business}. Bulk request: ${firstItems}${itemsArr.length > 8 ? " (and more)" : ""}. Delivery: ${location}. Contact: ${phone}`;
    const waUrl = `https://wa.me/233551836194?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  });

  // Update default WhatsApp chat link when fields change (optional nicety)
  function updateWaChatHref() {
    const business = document.getElementById("retailerName")?.value.trim() || "";
    const contact = document.getElementById("retailerContact")?.value.trim() || "";
    const sample = `Hello Mieza Delivery! I'm ${business || contact || "a retailer"} interested in bulk purchases.`;
    waChatBtn.href = `https://wa.me/233551836194?text=${encodeURIComponent(sample)}`;
  }
  document.getElementById("retailerName")?.addEventListener("input", updateWaChatHref);
  document.getElementById("retailerContact")?.addEventListener("input", updateWaChatHref);
});
