/* =========================================================
   NUVÉ STUDIO
   index.js
   Entrada da demonstração
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
       CHAVES
    ====================================================== */

  const DEMO_MODE_KEY = "nuve-demo-mode";

  /* =====================================================
       ELEMENTOS
    ====================================================== */

  const accessAppButton = document.getElementById("access-app-button");

  /* =====================================================
       ACESSAR APP
    ====================================================== */

  function accessApp() {
    /*
        A demonstração sempre começa
        pela experiência da cliente.

        Depois, dentro da principal,
        é possível alternar para Admin.
      */

    localStorage.setItem(DEMO_MODE_KEY, "cliente");

    accessAppButton.classList.add("is-loading");

    accessAppButton.innerHTML = `

        <span>
          Abrindo o app...
        </span>

      `;

    setTimeout(() => {
      window.location.href = "principal.html";
    }, 250);
  }

  /* =====================================================
       EVENTO
    ====================================================== */

  accessAppButton.addEventListener("click", accessApp);
});
