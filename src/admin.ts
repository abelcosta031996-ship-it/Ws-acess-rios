interface CatalogProduct {
  id: string;
  name: string;
  collection: string;
  description: string;
  image: string;
  price?: string;
  active?: boolean;
}

interface CatalogCollection {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
}

interface Catalog {
  version?: number;
  updatedAt?: string;
  collections?: CatalogCollection[];
  products?: CatalogProduct[];
}

type GitHubContent = { sha?: string; content?: string; encoding?: string };

const REPOSITORY = "abelcosta031996-ship-it/Ws-acess-rios";
const BRANCH = "main";
const CATALOG_URL = "catalogo.json";
const EDIT_URL = `https://github.com/${REPOSITORY}/edit/${BRANCH}/catalogo.json`;
const ACTIONS_URL = `https://github.com/${REPOSITORY}/actions/workflows/update-catalog.yml`;
const API_BASE = `https://api.github.com/repos/${REPOSITORY}/contents`;

let catalog: Catalog = { version: 1, collections: [], products: [] };
let githubToken = "";
let editingProductId: string | null = null;
let editingCollectionId: string | null = null;
let selectedImage: File | null = null;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function publicImagePath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return path.replace(/^\.?\//, "");
}

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || `produto-${Date.now()}`;
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function setStatus(message: string, error = false): void {
  const element = document.querySelector<HTMLElement>("[data-editor-status]");
  if (element) {
    element.textContent = message;
    element.dataset.error = error ? "true" : "false";
  }
}

function collections(): CatalogCollection[] {
  return catalog.collections || (catalog.collections = []);
}

function products(): CatalogProduct[] {
  return catalog.products || (catalog.products = []);
}

function renderCatalog(catalogData: Catalog): void {
  catalog = {
    version: catalogData.version || 1,
    updatedAt: catalogData.updatedAt,
    collections: (catalogData.collections || []).filter((item) => item.active !== false),
    products: (catalogData.products || []).filter((item) => item.active !== false),
  };
  const collectionsElement = document.querySelector<HTMLElement>("[data-published-collections]");
  const productsElement = document.querySelector<HTMLElement>("[data-published-products]");
  const updatedElement = document.querySelector<HTMLElement>("[data-catalog-updated]");
  if (updatedElement && catalog.updatedAt) {
    const date = new Date(catalog.updatedAt);
    updatedElement.textContent = Number.isNaN(date.getTime()) ? "Catálogo publicado" : `Publicado em ${date.toLocaleDateString("pt-PT")}`;
  }
  if (collectionsElement) {
    collectionsElement.innerHTML = collections().length ? collections().map((item) => `<article class="published-row"><strong>${escapeHtml(item.name)}</strong>${item.description ? `<span>${escapeHtml(item.description)}</span>` : ""}</article>`).join("") : "<p class=\"admin-empty\">Ainda não existem colecções publicadas.</p>";
  }
  if (productsElement) {
    productsElement.innerHTML = products().length ? products().map((item) => `<article class="published-product"><img src="${escapeHtml(publicImagePath(item.image))}" alt="${escapeHtml(item.name)}" loading="lazy"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.collection)}</span>${item.price ? `<b>${escapeHtml(item.price)}</b>` : ""}<button type="button" data-edit-product="${escapeHtml(item.id)}">Editar</button></div></article>`).join("") : "<p class=\"admin-empty\">Ainda não existem produtos publicados.</p>";
  }
  renderEditorLists();
}

function renderEditorLists(): void {
  const collectionList = document.querySelector<HTMLElement>("[data-editor-collections]");
  const productList = document.querySelector<HTMLElement>("[data-editor-products]");
  if (collectionList) {
    collectionList.innerHTML = collections().map((item) => `<li><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description || "Sem descrição")}</small></span><span><button type="button" data-edit-collection="${escapeHtml(item.id)}">Editar</button><button type="button" data-remove-collection="${escapeHtml(item.id)}">Remover</button></span></li>`).join("");
  }
  if (productList) {
    productList.innerHTML = products().map((item) => `<li><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.collection)}${item.price ? ` · ${escapeHtml(item.price)}` : ""}</small></span><button type="button" data-edit-product="${escapeHtml(item.id)}">Editar</button><button type="button" data-remove-product="${escapeHtml(item.id)}">Remover</button></li>`).join("");
  }
  const collectionSelect = document.querySelector<HTMLSelectElement>("[data-product-collection]");
  if (collectionSelect) {
    const current = collectionSelect.value;
    collectionSelect.innerHTML = collections().map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
    if (current && collections().some((item) => item.name === current)) collectionSelect.value = current;
  }
}

async function loadCatalog(): Promise<void> {
  const response = await fetch(`${CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar o catálogo publicado.");
  renderCatalog(await response.json() as Catalog);
}

async function githubRequest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!githubToken.trim()) throw new Error("Introduza o token do GitHub para publicar.");
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${githubToken.trim()}`);
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  return fetch(`${API_BASE}/${path}`, { ...init, headers });
}

async function readGitHubFile(path: string): Promise<GitHubContent> {
  const response = await githubRequest(path);
  if (!response.ok) throw new Error(`GitHub não permitiu ler ${path} (${response.status}).`);
  return response.json() as Promise<GitHubContent>;
}

async function writeGitHubFile(path: string, content: string, message: string): Promise<void> {
  let existing: GitHubContent = {};
  try { existing = await readGitHubFile(path); } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("404")) throw error;
  }
  const response = await githubRequest(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, branch: BRANCH, content, ...(existing.sha ? { sha: existing.sha } : {}) }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub recusou a publicação (${response.status}): ${details.slice(0, 180)}`);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function prepareImage(file: File): Promise<{ path: string; base64: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Seleccione uma imagem válida.");
  if (file.size > 8 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 8 MB.");
  const source = await fileToDataUrl(file);
  const image = new Image();
  image.src = source;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Imagem inválida.")); });
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL("image/jpeg", 0.86);
  const base64 = compressed.split(",")[1];
  const baseName = slugify(file.name.replace(/\.[^.]+$/, ""));
  return { path: `assets/catalogo/${baseName}.jpg`, base64 };
}

function readInput(selector: string): string {
  return document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)?.value.trim() || "";
}

function clearProductForm(): void {
  editingProductId = null;
  selectedImage = null;
  const form = document.querySelector<HTMLFormElement>("[data-product-form]");
  form?.reset();
  const title = document.querySelector<HTMLElement>("[data-product-form-title]");
  if (title) title.textContent = "Adicionar produto";
  const imageName = document.querySelector<HTMLElement>("[data-image-name]");
  if (imageName) imageName.textContent = "Nenhuma imagem seleccionada";
}

function editProduct(id: string): void {
  const product = products().find((item) => item.id === id);
  if (!product) return;
  editingProductId = id;
  (document.querySelector<HTMLInputElement>("[data-product-name]")!).value = product.name;
  (document.querySelector<HTMLSelectElement>("[data-product-collection]")!).value = product.collection;
  (document.querySelector<HTMLTextAreaElement>("[data-product-description]")!).value = product.description;
  (document.querySelector<HTMLInputElement>("[data-product-price]")!).value = product.price || "";
  const title = document.querySelector<HTMLElement>("[data-product-form-title]");
  if (title) title.textContent = "Editar produto";
  document.querySelector<HTMLElement>("[data-editor-panel]")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveProduct(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const name = readInput("[data-product-name]");
  const collection = (document.querySelector<HTMLSelectElement>("[data-product-collection]")?.value || "").trim();
  const description = readInput("[data-product-description]");
  const price = readInput("[data-product-price]");
  if (!name || !collection || !description || (!editingProductId && !selectedImage)) {
    setStatus("Preencha nome, colecção, descrição e uma imagem para um produto novo.", true);
    return;
  }
  let product = editingProductId ? products().find((item) => item.id === editingProductId) : undefined;
  if (!product) {
    const baseId = `${slugify(collection)}_${slugify(name).replace(/-/g, "_")}`;
    const id = products().some((item) => item.id === baseId) ? `${baseId}_${Date.now()}` : baseId;
    product = { id, name, collection, description, image: "", active: true };
    products().push(product);
  } else {
    product.name = name;
    product.collection = collection;
    product.description = description;
  }
  product.price = price || undefined;
  if (selectedImage) {
    setStatus("A preparar a imagem…");
    const prepared = await prepareImage(selectedImage);
    await writeGitHubFile(prepared.path, prepared.base64, `Adicionar imagem: ${name}`);
    product.image = prepared.path;
  }
  if (!product.image) {
    setStatus("O produto precisa de uma imagem publicada.", true);
    return;
  }
  await publishCatalog(`Actualizar produto: ${name}`);
  clearProductForm();
  renderCatalog(catalog);
  setStatus("Produto publicado com sucesso.");
}

async function publishCatalog(message = "Actualizar catálogo"): Promise<void> {
  catalog.version = (catalog.version || 1) + 1;
  catalog.updatedAt = new Date().toISOString();
  const content = encodeBase64Utf8(`${JSON.stringify(catalog, null, 2)}\n`);
  await writeGitHubFile(CATALOG_URL, content, message);
}

function editCollection(id: string): void {
  const collection = collections().find((item) => item.id === id);
  if (!collection) return;
  editingCollectionId = id;
  (document.querySelector<HTMLInputElement>("[data-collection-name]")!).value = collection.name;
  (document.querySelector<HTMLInputElement>("[data-collection-description]")!).value = collection.description || "";
  const title = document.querySelector<HTMLElement>("[data-collection-form-title]");
  if (title) title.textContent = "Editar colecção";
  document.querySelector<HTMLElement>("[data-editor-panel]")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveCollection(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const name = readInput("[data-collection-name]");
  const description = readInput("[data-collection-description]");
  if (!name || !description) { setStatus("Preencha o nome e a descrição da colecção.", true); return; }
  if (collections().some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== editingCollectionId)) { setStatus("Essa colecção já existe.", true); return; }
  if (editingCollectionId) {
    const collection = collections().find((item) => item.id === editingCollectionId);
    if (!collection) return;
    const previousName = collection.name;
    collection.name = name;
    collection.description = description;
    products().forEach((item) => { if (item.collection === previousName) item.collection = name; });
  } else {
    collections().push({ id: `collection_${slugify(name)}`, name, description, active: true });
  }
  const wasEditing = Boolean(editingCollectionId);
  await publishCatalog(`${wasEditing ? "Editar" : "Adicionar"} colecção: ${name}`);
  document.querySelector<HTMLFormElement>("[data-collection-form]")?.reset();
  editingCollectionId = null;
  const title = document.querySelector<HTMLElement>("[data-collection-form-title]");
  if (title) title.textContent = "Nova colecção";
  renderCatalog(catalog);
  setStatus("Colecção guardada e publicada com sucesso.");
}

function wireEditor(): void {
  document.querySelector<HTMLButtonElement>("[data-open-editor]")?.addEventListener("click", () => {
    document.querySelector<HTMLElement>("[data-editor-panel]")?.toggleAttribute("hidden");
  });
  document.querySelector<HTMLInputElement>("[data-github-token]")?.addEventListener("input", (event) => { githubToken = (event.target as HTMLInputElement).value; });
  document.querySelector<HTMLInputElement>("[data-product-image]")?.addEventListener("change", (event) => {
    selectedImage = (event.target as HTMLInputElement).files?.[0] || null;
    const name = document.querySelector<HTMLElement>("[data-image-name]");
    if (name) name.textContent = selectedImage ? `${selectedImage.name} · ${(selectedImage.size / 1024 / 1024).toFixed(1)} MB` : "Nenhuma imagem seleccionada";
  });
  document.querySelector<HTMLFormElement>("[data-product-form]")?.addEventListener("submit", (event) => { saveProduct(event).catch((error) => setStatus(error instanceof Error ? error.message : "Falha ao publicar produto.", true)); });
  document.querySelector<HTMLFormElement>("[data-collection-form]")?.addEventListener("submit", (event) => { saveCollection(event).catch((error) => setStatus(error instanceof Error ? error.message : "Falha ao publicar colecção.", true)); });
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const editId = target.closest<HTMLElement>("[data-edit-product]")?.dataset.editProduct;
    if (editId) editProduct(editId);
    const removeId = target.closest<HTMLElement>("[data-remove-product]")?.dataset.removeProduct;
    if (removeId && confirm("Remover este produto do catálogo?")) {
      catalog.products = products().filter((item) => item.id !== removeId);
      publishCatalog("Remover produto").then(() => { renderCatalog(catalog); setStatus("Produto removido e catálogo publicado."); }).catch((error) => setStatus(error instanceof Error ? error.message : "Falha ao remover produto.", true));
    }
    const editCollectionId = target.closest<HTMLElement>("[data-edit-collection]")?.dataset.editCollection;
    if (editCollectionId) editCollection(editCollectionId);
    const removeCollectionId = target.closest<HTMLElement>("[data-remove-collection]")?.dataset.removeCollection;
    const collectionToRemove = collections().find((item) => item.id === removeCollectionId);
    if (removeCollectionId && collectionToRemove && products().some((item) => item.collection === collectionToRemove.name)) {
      setStatus("Não é possível remover uma colecção com produtos associados. Edite primeiro esses produtos.", true);
      return;
    }
    if (removeCollectionId && confirm("Remover esta colecção?")) {
      catalog.collections = collections().filter((item) => item.id !== removeCollectionId);
      publishCatalog("Remover colecção").then(() => { renderCatalog(catalog); setStatus("Colecção removida e catálogo publicado."); }).catch((error) => setStatus(error instanceof Error ? error.message : "Falha ao remover colecção.", true));
    }
  });
  document.querySelector<HTMLButtonElement>("[data-clear-product]")?.addEventListener("click", clearProductForm);
}

async function setup(): Promise<void> {
  try { await loadCatalog(); } catch {
    const status = document.querySelector<HTMLElement>("[data-catalog-status]");
    if (status) status.textContent = "O catálogo publicado está temporariamente indisponível.";
  }
  document.querySelector<HTMLAnchorElement>("[data-edit-catalog]")?.setAttribute("href", EDIT_URL);
  document.querySelector<HTMLAnchorElement>("[data-open-actions]")?.setAttribute("href", ACTIONS_URL);
  wireEditor();
}

document.addEventListener("DOMContentLoaded", setup);
