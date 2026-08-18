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

const REPOSITORY = "abelcosta031996-ship-it/Ws-acess-rios";
const RAW_CATALOG_URL = `https://raw.githubusercontent.com/${REPOSITORY}/main/catalogo.json`;
const EDIT_CATALOG_URL = `https://github.com/${REPOSITORY}/edit/main/catalogo.json`;
const ACTIONS_URL = `https://github.com/${REPOSITORY}/actions/workflows/update-catalog.yml`;
const state: Catalog = { version: 1, updatedAt: new Date().toISOString(), collections: [], products: [] };

function show(id: string, visible: boolean) { const element = document.getElementById(id); if (element) element.hidden = !visible; }
function message(text: string, error = false) { const element = document.querySelector<HTMLElement>("[data-admin-message]"); if (element) { element.textContent = text; element.dataset.error = String(error); } }
function id(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function saveDraft() { localStorage.setItem("wswattson-catalog-draft", JSON.stringify(state, null, 2)); }
function loadDraft(): Catalog | null { try { const value = localStorage.getItem("wswattson-catalog-draft"); return value ? JSON.parse(value) as Catalog : null; } catch { return null; } }

function render() {
  const productList = document.querySelector<HTMLElement>("[data-product-list]");
  const collectionList = document.querySelector<HTMLElement>("[data-collection-list]");
  if (productList) productList.innerHTML = state.products.length ? state.products.map((item) => `<article class="admin-item"><div><strong>${item.name}</strong><small>${item.collection} · ${item.description}</small></div><div><button type="button" data-edit-product="${item.id}">Editar</button> <button type="button" data-delete-product="${item.id}">Apagar</button></div></article>`).join("") : "<p class=\"admin-empty\">Ainda não existem pulseiras.</p>";
  if (collectionList) collectionList.innerHTML = state.collections.length ? state.collections.map((item) => `<article class="admin-item"><div><strong>${item.name}</strong><small>${item.description || "Colecção activa"}</small></div><button type="button" data-delete-collection="${item.id}">Apagar</button></article>`).join("") : "<p class=\"admin-empty\">Ainda não existem colecções.</p>";
  productList?.querySelectorAll<HTMLButtonElement>("[data-edit-product]").forEach((button) => button.addEventListener("click", () => editProduct(button.dataset.editProduct || "")));
  productList?.querySelectorAll<HTMLButtonElement>("[data-delete-product]").forEach((button) => button.addEventListener("click", () => { state.products = state.products.filter((item) => item.id !== button.dataset.deleteProduct); saveDraft(); render(); }));
  collectionList?.querySelectorAll<HTMLButtonElement>("[data-delete-collection]").forEach((button) => button.addEventListener("click", () => { state.collections = state.collections.filter((item) => item.id !== button.dataset.deleteCollection); saveDraft(); render(); }));
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

function downloadCatalog() {
  const blob = new Blob([JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "catalogo.json"; link.click(); URL.revokeObjectURL(link.href);
}

async function setup() {
  const draft = loadDraft();
  try {
    const response = await fetch(RAW_CATALOG_URL, { cache: "no-store" });
    if (response.ok) Object.assign(state, await response.json());
    if (draft) Object.assign(state, draft);
    render();
    message(draft ? "Rascunho local carregado. Descarregue o JSON e publique-o pelo GitHub." : "Catálogo carregado do GitHub.");
  } catch { message("Não foi possível carregar o catálogo público. Pode começar um rascunho local.", true); render(); }

  document.querySelector<HTMLFormElement>("[data-product-form]")?.addEventListener("submit", (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const data = new FormData(form); const productId = String(data.get("id") || "");
    const item: CatalogProduct = { id: productId || id("product"), name: String(data.get("name") || "").trim(), collection: String(data.get("collection") || "").trim(), description: String(data.get("description") || "").trim(), image: String(data.get("image") || "").trim(), price: String(data.get("price") || "").trim() || undefined, active: true };
    state.products = productId ? state.products.map((product) => product.id === productId ? item : product) : [...state.products, item]; form.reset(); (form.elements.namedItem("id") as HTMLInputElement).value = ""; saveDraft(); render(); message("Pulseira guardada no rascunho.");
  });
  document.querySelector<HTMLFormElement>("[data-collection-form]")?.addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); state.collections = [...state.collections, { id: id("collection"), name: String(data.get("name") || "").trim(), description: String(data.get("description") || "").trim(), active: true }]; (event.currentTarget as HTMLFormElement).reset(); saveDraft(); render(); message("Colecção guardada no rascunho."); });
  document.querySelector<HTMLButtonElement>("[data-download]")?.addEventListener("click", downloadCatalog);
  document.querySelector<HTMLButtonElement>("[data-clear-draft]")?.addEventListener("click", () => { localStorage.removeItem("wswattson-catalog-draft"); location.reload(); });
}

document.addEventListener("DOMContentLoaded", setup);
