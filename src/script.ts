type CartButton = HTMLButtonElement;

const WHATSAPP_URL =
  "https://wa.me/244933224116?text=Ol%C3%A1%20WS%20Wattson%2C%20quero%20consultar%20o%20cat%C3%A1logo%20e%20fazer%20um%20pedido.";

function setupMobileMenu(): void {
  const button = document.querySelector<HTMLButtonElement>(".menu");
  const navigation = document.querySelector<HTMLElement>(".navegacao");

  if (!button || !navigation) return;

  button.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("aberto");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  navigation.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event: MouseEvent) => {
      const targetSelector = link.getAttribute("href");
      if (!targetSelector) return;

      const target = document.querySelector<HTMLElement>(targetSelector);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      navigation.classList.remove("aberto");
      button.setAttribute("aria-expanded", "false");
    });
  });
}

function setupEntranceAnimations(): void {
  const elements = document.querySelectorAll<HTMLElement>(".entrada");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("visivel"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visivel");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );

  elements.forEach((element) => observer.observe(element));
}

function setupCartButtons(): void {
  document.querySelectorAll<CartButton>("[data-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
    });
  });
}

function initialiseSite(): void {
  setupMobileMenu();
  setupEntranceAnimations();
  setupCartButtons();
}

document.addEventListener("DOMContentLoaded", initialiseSite);
