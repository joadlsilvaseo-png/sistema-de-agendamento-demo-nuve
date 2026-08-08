/* =========================================================
   NUVÉ STUDIO
   principal.js
   Protótipo demonstrativo - sem Firebase
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     ELEMENTOS
  ======================================================= */

  const body = document.body;

  const modeToggle = document.getElementById("demo-mode-toggle");

  const clientView = document.getElementById("client-view");
  const adminView = document.getElementById("admin-view");

  const adminNavigation = document.getElementById("admin-navigation");
  const clientNavigation = document.getElementById("client-navigation");

  const clientHomeNavigation = clientNavigation.querySelector(
    'a[href="principal.html"]',
  );

  const clientServicesNavigation = clientNavigation.querySelector(
    'a[href="principal.html#services-title"]',
  );

  const clientSearchArea = document.getElementById("client-search-area");

  const clientLabel = document.getElementById("demo-client-label");
  const adminLabel = document.getElementById("demo-admin-label");

  const profileModeBadge = document.getElementById("profile-mode-badge");
  const profileGreeting = document.getElementById("profile-greeting");
  const profileName = document.getElementById("profile-name");
  const profileDescription = document.getElementById("profile-description");
  const profileInitials = document.getElementById("profile-initials");
  const profileAction = document.getElementById("profile-action");

  const searchForm = document.getElementById("service-search-form");
  const searchInput = document.getElementById("service-search-input");
  const clearSearchButton = document.getElementById("clear-search-button");

  const serviceItems = document.querySelectorAll(".service-item");
  const searchEmpty = document.getElementById("service-search-empty");

  /* =======================================================
     CONFIGURAÇÃO DA DEMO
  ======================================================= */

  const STORAGE_MODE_KEY = "nuve-demo-mode";

  const MODES = {
    CLIENTE: "cliente",
    ADMIN: "admin",
  };

  /* =======================================================
     PERFIS DEMONSTRATIVOS
  ======================================================= */

  const demoProfiles = {
    cliente: {
      badge: "Área da cliente",
      greeting: "Olá, seja bem-vinda",
      name: "Isabele Mariana",
      description: "Seu próximo momento de cuidado começa aqui.",
      initials: "MA",
      actionHref: "meu-perfil.html",
      actionLabel: "Acessar meu perfil",
    },

    admin: {
      badge: "Área administrativa",
      greeting: "Bem-vinda de volta",
      name: "Camila",
      description: "Acompanhe sua agenda, clientes e resultados do estúdio.",
      initials: "CS",
      actionHref: "dashboard.html",
      actionLabel: "Acessar dashboard",
    },
  };

  /* =======================================================
     DEFINIR MODO
  ======================================================= */

  function setDemoMode(mode, save = true) {
    const isAdmin = mode === MODES.ADMIN;

    body.dataset.demoMode = isAdmin ? MODES.ADMIN : MODES.CLIENTE;

    /* -----------------------------------------------------
       CHAVE
    ----------------------------------------------------- */

    modeToggle.checked = isAdmin;

    modeToggle.setAttribute("aria-checked", String(isAdmin));

    /* -----------------------------------------------------
       TELAS
    ----------------------------------------------------- */

    clientView.hidden = isAdmin;
    adminView.hidden = !isAdmin;

    adminNavigation.hidden = !isAdmin;
    clientNavigation.hidden = isAdmin;

    clientSearchArea.hidden = isAdmin;

    /* -----------------------------------------------------
       LABELS DA CHAVE
    ----------------------------------------------------- */

    clientLabel.classList.toggle("demo-mode-label--active", !isAdmin);

    adminLabel.classList.toggle("demo-mode-label--active", isAdmin);

    /* -----------------------------------------------------
       PERFIL
    ----------------------------------------------------- */

    const profile = isAdmin ? demoProfiles.admin : demoProfiles.cliente;

    profileModeBadge.textContent = profile.badge;

    profileGreeting.textContent = profile.greeting;

    profileName.textContent = profile.name;

    profileDescription.textContent = profile.description;

    profileInitials.textContent = profile.initials;

    profileAction.href = profile.actionHref;

    profileAction.setAttribute("aria-label", profile.actionLabel);

    /* -----------------------------------------------------
       SALVAR
    ----------------------------------------------------- */

    if (save) {
      localStorage.setItem(STORAGE_MODE_KEY, mode);
    }

    /* -----------------------------------------------------
       TOPO
    ----------------------------------------------------- */

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     CARREGAR MODO SALVO
  ======================================================= */

  function loadSavedMode() {
    const savedMode = localStorage.getItem(STORAGE_MODE_KEY);

    if (savedMode === MODES.ADMIN) {
      setDemoMode(MODES.ADMIN, false);

      return;
    }

    setDemoMode(MODES.CLIENTE, false);
  }

  /* =======================================================
     EVENTO DA CHAVE
  ======================================================= */

  modeToggle.addEventListener("change", () => {
    const selectedMode = modeToggle.checked ? MODES.ADMIN : MODES.CLIENTE;

    setDemoMode(selectedMode);
  });

  /* =======================================================
     NAVEGAÇÃO CLIENTE
  ======================================================= */

  function updateClientNavigationState() {
    const isServicesArea = window.location.hash === "#services-title";

    clientHomeNavigation.classList.toggle(
      "client-navigation-item--active",
      !isServicesArea,
    );

    clientServicesNavigation.classList.toggle(
      "client-navigation-item--active",
      isServicesArea,
    );
  }

  window.addEventListener("hashchange", updateClientNavigationState);

  /* =======================================================
     PESQUISA DE SERVIÇOS
  ======================================================= */

  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function filterServices() {
    const searchTerm = normalizeText(searchInput.value);

    let visibleItems = 0;

    serviceItems.forEach((item) => {
      const searchData = normalizeText(item.dataset.search || "");

      const cardText = normalizeText(item.textContent || "");

      const matches =
        searchTerm === "" ||
        searchData.includes(searchTerm) ||
        cardText.includes(searchTerm);

      item.hidden = !matches;

      if (matches) {
        visibleItems++;
      }
    });

    /* -----------------------------------------------------
       BOTÃO LIMPAR
    ----------------------------------------------------- */

    clearSearchButton.hidden = searchTerm === "";

    /* -----------------------------------------------------
       MENSAGEM VAZIA
    ----------------------------------------------------- */

    searchEmpty.hidden = visibleItems > 0;
  }

  /* =======================================================
     DIGITAÇÃO
  ======================================================= */

  searchInput.addEventListener("input", filterServices);

  /* =======================================================
     LIMPAR PESQUISA
  ======================================================= */

  clearSearchButton.addEventListener("click", () => {
    searchInput.value = "";

    filterServices();

    searchInput.focus();
  });

  /* =======================================================
     EVITAR ENVIO DO FORM
  ======================================================= */

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  /* =======================================================
     ACESSIBILIDADE POR TECLADO
  ======================================================= */

  document.addEventListener("keydown", (event) => {
    /*
        Ctrl + Alt + A
        abre modo Admin
      */

    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "a") {
      setDemoMode(MODES.ADMIN);
    }

    /*
        Ctrl + Alt + C
        abre modo Cliente
      */

    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "c") {
      setDemoMode(MODES.CLIENTE);
    }
  });

  /* =======================================================
     PREPARAR DADOS DEMONSTRATIVOS
  ======================================================= */

  function initializeDemoData() {
    const DEMO_DATA_KEY = "nuve-demo-data";

    const existingData = localStorage.getItem(DEMO_DATA_KEY);

    if (existingData) {
      return;
    }

    const demoData = {
      studio: {
        name: "Nuvé Studio",
        professional: "Camila Santos",
      },

      clienteAtual: {
        id: 1,
        nome: "Isabele Mariana Vieira",
        telefone: "(11) 99999-1020",
        email: "isabele@email.demo",
      },

      clientes: [
        {
          id: 1,
          nome: "Isabele Mariana Vieira",
          telefone: "(11) 99999-1020",
          visitas: 8,
        },

        {
          id: 2,
          nome: "Luiza Martins",
          telefone: "(11) 99999-2045",
          visitas: 5,
        },

        {
          id: 3,
          nome: "Beatriz Souza",
          telefone: "(11) 99999-3188",
          visitas: 11,
        },

        {
          id: 4,
          nome: "Fernanda Lima",
          telefone: "(11) 99999-4261",
          visitas: 3,
        },

        {
          id: 5,
          nome: "Juliana Rocha",
          telefone: "(11) 99999-5394",
          visitas: 6,
        },
      ],

      servicos: [
        {
          id: 1,
          categoria: "Unhas em Gel",
          nome: "Alongamento em Gel",
          preco: 160,
          duracao: 120,
        },

        {
          id: 2,
          categoria: "Unhas em Gel",
          nome: "Manutenção em Gel",
          preco: 110,
          duracao: 90,
        },

        {
          id: 3,
          categoria: "Unhas em Gel",
          nome: "Banho de Gel",
          preco: 85,
          duracao: 75,
        },

        {
          id: 4,
          categoria: "Manicure",
          nome: "Manicure Completa",
          preco: 40,
          duracao: 50,
        },

        {
          id: 5,
          categoria: "Pedicure",
          nome: "Pedicure Completa",
          preco: 45,
          duracao: 60,
        },
      ],

      agendamentos: [
        {
          id: 1,
          clienteId: 1,
          cliente: "Isabele Mariana Vieira",
          servicoId: 2,
          servico: "Manutenção em Gel",
          data: "2026-08-12",
          horario: "14:30",
          preco: 110,
          status: "confirmado",
        },

        {
          id: 2,
          clienteId: 2,
          cliente: "Luiza Martins",
          servicoId: 4,
          servico: "Manicure Completa",
          data: "2026-08-12",
          horario: "16:00",
          preco: 40,
          status: "pendente",
        },

        {
          id: 3,
          clienteId: 3,
          cliente: "Beatriz Souza",
          servicoId: 3,
          servico: "Banho de Gel",
          data: "2026-08-12",
          horario: "17:30",
          preco: 85,
          status: "confirmado",
        },

        {
          id: 4,
          clienteId: 4,
          cliente: "Fernanda Lima",
          servicoId: 5,
          servico: "Pedicure Completa",
          data: "2026-08-13",
          horario: "10:00",
          preco: 45,
          status: "confirmado",
        },
      ],
    };

    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
  }

  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  initializeDemoData();

  loadSavedMode();

  updateClientNavigationState();

  filterServices();
});
