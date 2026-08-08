/* =========================================================
   NUVÉ STUDIO
   admin-servicos.js
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     CHAVES
  ======================================================= */

  const DEMO_DATA_KEY = "nuve-demo-data";

  const DEMO_MODE_KEY = "nuve-demo-mode";

  /* =======================================================
     ELEMENTOS
  ======================================================= */

  const metricTotal = document.getElementById("metric-total");

  const metricActive = document.getElementById("metric-active");

  const metricInactive = document.getElementById("metric-inactive");

  const metricAverage = document.getElementById("metric-average");

  const searchForm = document.getElementById("search-form");

  const searchInput = document.getElementById("search-input");

  const clearSearchButton = document.getElementById("clear-search-button");

  const filterButtons = document.querySelectorAll(".filter-button");

  const servicesList = document.getElementById("services-list");

  const servicesCount = document.getElementById("services-count");

  const emptyState = document.getElementById("empty-state");

  const newServiceButton = document.getElementById("new-service-button");

  const serviceModal = document.getElementById("service-modal");

  const closeModalButton = document.getElementById("close-modal-button");

  const modalTitle = document.getElementById("modal-title");

  const serviceForm = document.getElementById("service-form");

  const serviceId = document.getElementById("service-id");

  const serviceName = document.getElementById("service-name");

  const serviceCategory = document.getElementById("service-category");

  const servicePrice = document.getElementById("service-price");

  const serviceDuration = document.getElementById("service-duration");

  const serviceActive = document.getElementById("service-active");

  const deleteServiceButton = document.getElementById("delete-service-button");

  /* =======================================================
     ESTADO
  ======================================================= */

  let demoData = {
    servicos: [],
  };

  let currentFilter = "all";

  let searchTerm = "";

  let editingServiceId = null;

  localStorage.setItem(DEMO_MODE_KEY, "admin");

  /* =======================================================
     UTILITÁRIOS
  ======================================================= */

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  }

  function formatDuration(minutes) {
    const total = Number(minutes || 0);

    const hours = Math.floor(total / 60);

    const remainingMinutes = total % 60;

    if (hours && remainingMinutes) {
      return `${hours}h${remainingMinutes}`;
    }

    if (hours) {
      return `${hours}h`;
    }

    return `${remainingMinutes} min`;
  }

  /* =======================================================
     CARREGAR
  ======================================================= */

  function loadData() {
    const stored = localStorage.getItem(DEMO_DATA_KEY);

    if (stored) {
      try {
        demoData = JSON.parse(stored);
      } catch (error) {
        demoData = {
          servicos: [],
        };
      }
    }

    if (!Array.isArray(demoData.servicos)) {
      demoData.servicos = [];
    }

    ensureDefaultServices();
  }

  /* =======================================================
     SERVIÇOS PADRÃO
  ======================================================= */

  function ensureDefaultServices() {
    const defaults = [
      {
        id: 1,
        categoria: "Unhas em Gel",
        nome: "Alongamento em Gel",
        preco: 160,
        duracao: 120,
        ativo: true,
      },

      {
        id: 2,
        categoria: "Unhas em Gel",
        nome: "Manutenção em Gel",
        preco: 110,
        duracao: 90,
        ativo: true,
      },

      {
        id: 3,
        categoria: "Unhas em Gel",
        nome: "Banho de Gel",
        preco: 85,
        duracao: 75,
        ativo: true,
      },

      {
        id: 4,
        categoria: "Manicure",
        nome: "Manicure Completa",
        preco: 40,
        duracao: 50,
        ativo: true,
      },

      {
        id: 5,
        categoria: "Pedicure",
        nome: "Pedicure Completa",
        preco: 45,
        duracao: 60,
        ativo: true,
      },

      {
        id: 6,
        categoria: "Unhas em Gel",
        nome: "Blindagem",
        preco: 70,
        duracao: 60,
        ativo: true,
      },

      {
        id: 7,
        categoria: "Unhas em Gel",
        nome: "Remoção de Gel",
        preco: 45,
        duracao: 45,
        ativo: true,
      },
    ];

    defaults.forEach((defaultService) => {
      const existing = demoData.servicos.find(
        (service) => Number(service.id) === Number(defaultService.id),
      );

      if (!existing) {
        demoData.servicos.push(defaultService);

        return;
      }

      if (existing.ativo === undefined) {
        existing.ativo = true;
      }
    });

    saveData();
  }

  /* =======================================================
     SALVAR
  ======================================================= */

  function saveData() {
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
  }

  /* =======================================================
     MÉTRICAS
  ======================================================= */

  function renderMetrics() {
    const total = demoData.servicos.length;

    const active = demoData.servicos.filter(
      (service) => service.ativo !== false,
    );

    const inactive = demoData.servicos.filter(
      (service) => service.ativo === false,
    );

    const average = active.length
      ? active.reduce((sum, service) => sum + Number(service.preco || 0), 0) /
        active.length
      : 0;

    metricTotal.textContent = total;

    metricActive.textContent = active.length;

    metricInactive.textContent = inactive.length;

    metricAverage.textContent = formatCurrency(average);
  }

  /* =======================================================
     FILTRAGEM
  ======================================================= */

  function getFilteredServices() {
    let services = [...demoData.servicos];

    if (currentFilter === "active") {
      services = services.filter((service) => service.ativo !== false);
    }

    if (currentFilter === "inactive") {
      services = services.filter((service) => service.ativo === false);
    }

    if (currentFilter === "gel") {
      services = services.filter((service) =>
        normalizeText(service.categoria).includes("gel"),
      );
    }

    if (currentFilter === "manicure") {
      services = services.filter(
        (service) => normalizeText(service.categoria) === "manicure",
      );
    }

    if (currentFilter === "pedicure") {
      services = services.filter(
        (service) => normalizeText(service.categoria) === "pedicure",
      );
    }

    if (searchTerm) {
      services = services.filter((service) => {
        const content = normalizeText(`${service.nome} ${service.categoria}`);

        return content.includes(searchTerm);
      });
    }

    return services.sort((first, second) =>
      first.nome.localeCompare(second.nome, "pt-BR"),
    );
  }

  /* =======================================================
     CRIAR CARD
  ======================================================= */

  function createServiceCard(service) {
    const card = document.createElement("article");

    card.className = "service-card";

    if (service.ativo === false) {
      card.classList.add("service-card--inactive");
    }

    const active = service.ativo !== false;

    card.innerHTML = `

      <div class="service-card-main">

        <span class="service-icon">

          <svg viewBox="0 0 24 24" fill="none">

            <path
              d="M12 3L13.5 7L17.5 8.5L13.5 10L12 14L10.5 10L6.5 8.5L10.5 7L12 3Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <path
              d="M18 14L18.8 16.2L21 17L18.8 17.8L18 20L17.2 17.8L15 17L17.2 16.2L18 14Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

          </svg>

        </span>


        <div class="service-info">

          <span class="service-category">
            ${service.categoria}
          </span>

          <strong>
            ${service.nome}
          </strong>


          <div class="service-meta">

            <span>
              ${formatCurrency(service.preco)}
            </span>

            <span class="meta-dot"></span>

            <span>
              ${formatDuration(service.duracao)}
            </span>

          </div>

        </div>


        <span
          class="
            service-status
            ${active ? "" : "service-status--inactive"}
          "
        >

          ${active ? "Ativo" : "Inativo"}

        </span>

      </div>


      <div class="service-card-actions">

        <button
          type="button"
          class="service-action-button"
          data-action="edit"
        >
          Editar
        </button>


        <button
          type="button"
          class="
            service-action-button
            service-action-button--status
          "
          data-action="status"
        >

          ${active ? "Desativar" : "Ativar"}

        </button>

      </div>

    `;

    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
      openEditModal(service);
    });

    card
      .querySelector('[data-action="status"]')
      .addEventListener("click", () => {
        toggleServiceStatus(service.id);
      });

    return card;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  function renderServices() {
    const services = getFilteredServices();

    servicesList.innerHTML = "";

    services.forEach((service) => {
      servicesList.appendChild(createServiceCard(service));
    });

    servicesCount.textContent =
      services.length === 1 ? "1 serviço" : `${services.length} serviços`;

    servicesList.hidden = services.length === 0;

    emptyState.hidden = services.length > 0;

    renderMetrics();
  }

  /* =======================================================
     ALTERAR STATUS
  ======================================================= */

  function toggleServiceStatus(id) {
    const service = demoData.servicos.find(
      (item) => String(item.id) === String(id),
    );

    if (!service) {
      return;
    }

    service.ativo = service.ativo === false;

    saveData();

    renderServices();
  }

  /* =======================================================
     NOVO SERVIÇO
  ======================================================= */

  function openNewServiceModal() {
    editingServiceId = null;

    modalTitle.textContent = "Novo serviço";

    serviceForm.reset();

    serviceId.value = "";

    serviceActive.checked = true;

    deleteServiceButton.hidden = true;

    openModal();
  }

  /* =======================================================
     EDITAR
  ======================================================= */

  function openEditModal(service) {
    editingServiceId = service.id;

    modalTitle.textContent = "Editar serviço";

    serviceId.value = service.id;

    serviceName.value = service.nome;

    serviceCategory.value = service.categoria;

    servicePrice.value = service.preco;

    serviceDuration.value = service.duracao;

    serviceActive.checked = service.ativo !== false;

    deleteServiceButton.hidden = false;

    openModal();
  }

  /* =======================================================
     MODAL
  ======================================================= */

  function openModal() {
    serviceModal.hidden = false;

    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    serviceModal.hidden = true;

    document.body.style.overflow = "";
  }

  newServiceButton.addEventListener("click", openNewServiceModal);

  closeModalButton.addEventListener("click", closeModal);

  serviceModal.addEventListener("click", (event) => {
    if (event.target === serviceModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !serviceModal.hidden) {
      closeModal();
    }
  });

  /* =======================================================
     SALVAR FORM
  ======================================================= */

  serviceForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = serviceName.value.trim();

    const category = serviceCategory.value;

    const price = Number(servicePrice.value);

    const duration = Number(serviceDuration.value);

    if (!name || !category || price < 0 || duration <= 0) {
      return;
    }

    if (editingServiceId) {
      const service = demoData.servicos.find(
        (item) => String(item.id) === String(editingServiceId),
      );

      if (!service) {
        return;
      }

      service.nome = name;

      service.categoria = category;

      service.preco = price;

      service.duracao = duration;

      service.ativo = serviceActive.checked;
    } else {
      const newService = {
        id: Date.now(),

        nome: name,

        categoria: category,

        preco: price,

        duracao: duration,

        ativo: serviceActive.checked,
      };

      demoData.servicos.push(newService);
    }

    saveData();

    closeModal();

    renderServices();
  });

  /* =======================================================
     EXCLUIR
  ======================================================= */

  deleteServiceButton.addEventListener("click", () => {
    if (!editingServiceId) {
      return;
    }

    const confirmed = confirm("Deseja excluir este serviço da demonstração?");

    if (!confirmed) {
      return;
    }

    demoData.servicos = demoData.servicos.filter(
      (service) => String(service.id) !== String(editingServiceId),
    );

    saveData();

    closeModal();

    renderServices();
  });

  /* =======================================================
     PESQUISA
  ======================================================= */

  searchInput.addEventListener("input", () => {
    searchTerm = normalizeText(searchInput.value);

    clearSearchButton.hidden = !searchTerm;

    renderServices();
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  clearSearchButton.addEventListener("click", () => {
    searchInput.value = "";

    searchTerm = "";

    clearSearchButton.hidden = true;

    searchInput.focus();

    renderServices();
  });

  /* =======================================================
     FILTROS
  ======================================================= */

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;

      filterButtons.forEach((item) => {
        item.classList.remove("filter-button--active");
      });

      button.classList.add("filter-button--active");

      renderServices();
    });
  });

  /* =======================================================
     INICIAR
  ======================================================= */

  function initialize() {
    loadData();

    renderServices();
  }

  initialize();
});
