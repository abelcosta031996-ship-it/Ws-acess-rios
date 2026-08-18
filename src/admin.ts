interface AdminProduct {
  name: string;
  collection: string;
  description: string;
  image: string;
}

const ADMIN_HASH_KEY = "wswattson-admin-password-hash";
const ADMIN_SESSION_KEY = "wswattson-admin-session";
const ADMIN_PRODUCTS_KEY = "wswattson-admin-products";

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function products(): AdminProduct[] {
  try { return JSON.parse(localStorage.getItem(ADMIN_PRODUCTS_KEY) || "[]") as AdminProduct[]; } catch { return []; }
}

function saveProducts(items: AdminProduct[]): void {
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(items));
}

function show(id: string, visible: boolean): void {
  const element = document.getElementById(id);
  if (element) element.hidden = !visible;
}

function renderProducts(): void {
  const list = document.querySelector<HTMLElement>("[data-product-list]");
  if (!list) return;
  const items = products();
  list.innerHTML = items.length ? items.map((item, index) => `<article class="admin-item"><div><strong>${item.name}</strong><small>${item.collection} · ${item.description}</small></div><button type="button" data-delete-product="${index}">Apagar</button></article>`).join("") : "<p class=\"admin-empty\">Ainda não existem produtos guardados neste dispositivo.</p>";
  list.querySelectorAll<HTMLButtonElement>("[data-delete-product]").forEach((button) => button.addEventListener("click", () => { saveProducts(products().filter((_, index) => index !== Number(button.dataset.deleteProduct))); renderProducts(); }));
}

function exportCatalog(): void {
  const content = JSON.stringify({ updatedAt: new Date().toISOString(), products: products() }, null, 2);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  link.download = "catalogo.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function setupAdmin(): void {
  const loginForm = document.querySelector<HTMLFormElement>("[data-login-form]");
  const productForm = document.querySelector<HTMLFormElement>("[data-product-form]");
  const message = document.querySelector<HTMLElement>("[data-login-message]");

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "valid") { show("admin-login", false); show("admin-panel", true); renderProducts(); }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = loginForm.querySelector<HTMLInputElement>("[name=password]")?.value || "";
    if (password.length < 8) { if (message) message.textContent = "A palavra-passe deve ter pelo menos 8 caracteres."; return; }
    const hash = await hashPassword(password);
    const stored = localStorage.getItem(ADMIN_HASH_KEY);
    if (!stored) {
      localStorage.setItem(ADMIN_HASH_KEY, hash);
      sessionStorage.setItem(ADMIN_SESSION_KEY, "valid");
      show("admin-login", false); show("admin-panel", true); renderProducts(); return;
    }
    if (stored !== hash) { if (message) message.textContent = "Palavra-passe incorrecta."; return; }
    sessionStorage.setItem(ADMIN_SESSION_KEY, "valid");
    show("admin-login", false); show("admin-panel", true); renderProducts();
  });

  productForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(productForm);
    saveProducts([...products(), { name: String(data.get("name") || ""), collection: String(data.get("collection") || ""), description: String(data.get("description") || ""), image: String(data.get("image") || "") }]);
    productForm.reset(); renderProducts();
  });
  document.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener("click", exportCatalog);
  document.querySelector<HTMLButtonElement>("[data-logout]")?.addEventListener("click", () => { sessionStorage.removeItem(ADMIN_SESSION_KEY); location.reload(); });
}

document.addEventListener("DOMContentLoaded", setupAdmin);
