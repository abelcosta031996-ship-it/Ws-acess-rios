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

const REPOSITORY = "abelcosta031996-ship-it/Ws-acess-rios";
const CATALOG_URL = "catalogo.json";
const EDIT_URL = `https://github.com/${REPOSITORY}/edit/main/catalogo.json`;
const ACTIONS_URL = `https://github.com/${REPOSITORY}/actions/workflows/update-catalog.yml`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] || character);
}

function publicImagePath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return path.replace(/^\.?\//, "");
}

function renderCatalog(catalog: Catalog): void {
  const collections = (catalog.collections || []).filter((item) => item.active !== false);
  const products = (catalog.products || []).filter((item) => item.active !== false);
  const collectionsElement = document.querySelector<HTMLElement>("[data-published-collections]");
  const productsElement = document.querySelector<HTMLElement>("[data-published-products]");
  const updatedElement = document.querySelector<HTMLElement>("[data-catalog-updated]");

  if (updatedElement && catalog.updatedAt) {
    const date = new Date(catalog.updatedAt);
    updatedElement.textContent = Number.isNaN(date.getTime()) ? "Catálogo publicado" : `Publicado em ${date.toLocaleDateString("pt-PT")}`;
  }

  if (collectionsElement && collections.length) {
    collectionsElement.innerHTML = collections.map((item) => `<article class="published-row"><strong>${escapeHtml(item.name)}</strong>${item.description ? `<span>${escapeHtml(item.description)}</span>` : ""}</article>`).join("");
  } else if (collectionsElement) {
    collectionsElement.hidden = true;
  }

  if (productsElement && products.length) {
    productsElement.innerHTML = products.map((item) => `<article class="published-product"><img src="${escapeHtml(publicImagePath(item.image))}" alt="${escapeHtml(item.name)}" loading="lazy"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.collection)}</span>${item.price ? `<b>${escapeHtml(item.price)}</b>` : ""}</div></article>`).join("");
  } else if (productsElement) {
    productsElement.hidden = true;
  }
}

async function setup(): Promise<void> {
  try {
    const response = await fetch(`${CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("catalog unavailable");
    renderCatalog(await response.json() as Catalog);
  } catch {
    const status = document.querySelector<HTMLElement>("[data-catalog-status]");
    if (status) status.textContent = "O catálogo publicado está temporariamente indisponível.";
  }

  document.querySelector<HTMLAnchorElement>("[data-edit-catalog]")?.setAttribute("href", EDIT_URL);
  document.querySelector<HTMLAnchorElement>("[data-open-actions]")?.setAttribute("href", ACTIONS_URL);
}

document.addEventListener("DOMContentLoaded", setup);
