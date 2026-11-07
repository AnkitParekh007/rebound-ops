/* Apply the saved or system theme before CSS paints. No inline script is needed. */
(() => {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = null;
  try {
    preference = localStorage.getItem("reboundops-theme");
  } catch {
    /* Private storage may be blocked. */
  }
  if (preference !== "light" && preference !== "dark") preference = null;
  function apply(theme) {
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute("content", theme === "dark" ? "#080c12" : "#ffffff");
    const button = document.querySelector(".theme-toggle");
    if (button) {
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.setAttribute(
        "aria-label",
        `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      );
      button.title = button.getAttribute("aria-label");
    }
  }
  apply(preference || (media.matches ? "dark" : "light"));
  media.addEventListener("change", (event) => {
    if (!preference) apply(event.matches ? "dark" : "light");
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== "reboundops-theme") return;
    preference = ["light", "dark"].includes(event.newValue)
      ? event.newValue
      : null;
    apply(preference || (media.matches ? "dark" : "light"));
  });
  document.addEventListener("DOMContentLoaded", () => {
    apply(root.dataset.theme);
    document.querySelector(".theme-toggle")?.addEventListener("click", () => {
      preference = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("reboundops-theme", preference);
      } catch {
        /* Theme still works for this page. */
      }
      apply(preference);
    });
  });
})();
