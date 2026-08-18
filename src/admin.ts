interface CatalogProduct {
  id: string;
  name: string;
  collection: string;
  description: string;
  image: string;
  price?: string;
  active: boolean;
}

interface CatalogCollection {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

interface Catalog {
  version: 1;
  updatedAt: string;
  collections: CatalogCollection[];
  products: CatalogProduct[];
}

const API_BASE = (window as Window & { WS_MANAGEMENT_API_URL?: string }).WS_MANAGEMENT_API_URL || "https://wattsonapi-g4rwwksc.manus.space/api/management";
const state: Catalog = { version: 1, updatedAt: new Date().toISOString(), collections: [], products: [] };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error || "Não foi possível concluir a operação."));
  return body as any;
}

function show(id: string, visible: boolean) { const element = document.getElementById(id); if (element) element.hidden = !visible; }
function message(text: string, error = false) { const element = document.querySelector<HTMLElement>("[data-admin-message]"); if (element) { element.textContent = text; element.dataset.error = String(error); } }
function id(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function render() {
  const productList = document.querySelector<HTMLElement>("[data-product-list]");
  const collectionList = document.querySelector<HTMLElement>("[data-collection-list]");
  if (productList) productList.innerHTML = state.products.length ? state.products.map((item) => `<article class="admin-item"><div><strong>${item.name}</strong><small>${item.collection} · ${item.description}</small></div><div><button type="button" data-edit-product="${item.id}">Editar</button> <button type="button" data-delete-product="${item.id}">Apagar</button></div></article>`).join("") : "<p class=\"admin-empty\">Ainda não existem pulseiras.</p>";
  if (collectionList) collectionList.innerHTML = state.collections.length ? state.collections.map((item) => `<article class="admin-item"><div><strong>${item.name}</strong><small>${item.description || "Colecção activa"}</small></div><button type="button" data-delete-collection="${item.id}">Apagar</button></article>`).join("") : "<p class=\"admin-empty\">Ainda não existem colecções.</p>";
  productList?.querySelectorAll<HTMLButtonElement>("[data-edit-product]").forEach((button) => button.addEventListener("click", () => editProduct(button.dataset.editProduct || "")));
  productList?.querySelectorAll<HTMLButtonElement>("[data-delete-product]").forEach((button) => button.addEventListener("click", () => { state.products = state.products.filter((item) => item.id !== button.dataset.deleteProduct); render(); }));
  collectionList?.querySelectorAll<HTMLButtonElement>("[data-delete-collection]").forEach((button) => button.addEventListener("click", () => { state.collections = state.collections.filter((item) => item.id !== button.dataset.deleteCollection); render(); }));
}

function editProduct(productId: string) {
  const item = state.products.find((product) => product.id === productId); if (!item) return;
  const form = document.querySelector<HTMLFormElement>("[data-product-form]"); if (!form) return;
  (form.elements.namedItem("id") as HTMLInputElement).value = item.id;
  (form.elements.namedItem("name") as HTMLInputElement).value = item.name;
  (form.elements.namedItem("collection") as HTMLInputElement).value = item.collection;
  (form.elements.namedItem("description") as HTMLTextAreaElement).value = item.description;
  (form.elements.namedItem("image") as HTMLInputElement).value = item.image;
  (form.elements.namedItem("price") as HTMLInputElement).value = item.price || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function setup() {
  try {
    const session = await api("/auth/session");
    if (session.authenticated) { show("admin-login", false); show("admin-panel", true); const catalog = await api("/catalog"); Object.assign(state, catalog); render(); }
  } catch { message("Não foi possível ligar ao serviço de gestão.", true); }

  document.querySelector<HTMLFormElement>("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const password = String(new FormData(form).get("password") || "");
    try { await api("/auth/login", { method: "POST", body: JSON.stringify({ password }) }); show("admin-login", false); show("admin-panel", true); const catalog = await api("/catalog"); Object.assign(state, catalog); render(); message("Sessão iniciada."); } catch { message("Palavra-passe incorrecta ou serviço indisponível.", true); }
  });

  document.querySelector<HTMLFormElement>("[data-product-form]")?.addEventListener("submit", (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const data = new FormData(form); const productId = String(data.get("id") || "");
    const item: CatalogProduct = { id: productId || id("product"), name: String(data.get("name") || "").trim(), collection: String(data.get("collection") || "").trim(), description: String(data.get("description") || "").trim(), image: String(data.get("image") || "").trim(), price: String(data.get("price") || "").trim() || undefined, active: true };
    state.products = productId ? state.products.map((product) => product.id === productId ? item : product) : [...state.products, item]; form.reset(); (form.elements.namedItem("id") as HTMLInputElement).value = ""; render(); message("Pulseira guardada no rascunho. Publique para actualizar o site.");
  });

  document.querySelector<HTMLFormElement>("[data-collection-form]")?.addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); state.collections = [...state.collections, { id: id("collection"), name: String(data.get("name") || "").trim(), description: String(data.get("description") || "").trim(), active: true }]; (event.currentTarget as HTMLFormElement).reset(); render(); });
  document.querySelector<HTMLButtonElement>("[data-publish]")?.addEventListener("click", async () => { try { const result = await api("/catalog", { method: "PUT", body: JSON.stringify({ ...state, updatedAt: new Date().toISOString() }) }); message(`Publicado com sucesso. Commit ${result.commitSha || "criado"}.`); } catch (error) { message(error instanceof Error ? error.message : "Falha ao publicar.", true); } });
  document.querySelector<HTMLButtonElement>("[data-logout]")?.addEventListener("click", async () => { await api("/auth/logout", { method: "POST" }).catch(() => undefined); location.reload(); });
}

document.addEventListener("DOMContentLoaded", setup);
