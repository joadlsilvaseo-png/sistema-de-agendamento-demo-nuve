/* =========================================================
   NUVÉ STUDIO
   admin-clientes.js
   Protótipo demonstrativo - sem Firebase
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

  const metricClients = document.getElementById("metric-clients");

  const metricVisits = document.getElementById("metric-visits");

  const metricRecurring = document.getElementById("metric-recurring");

  const metricRevenue = document.getElementById("metric-revenue");

  const searchForm = document.getElementById("search-form");

  const searchInput = document.getElementById("search-input");

  const clearSearchButton = document.getElementById("clear-search-button");

  const filterButtons = document.querySelectorAll(".filter-button");

  const clientsList = document.getElementById("clients-list");

  const clientsCount = document.getElementById("clients-count");

  const emptyState = document.getElementById("empty-state");

  const clientModal = document.getElementById("client-modal");

  const closeModalButton = document.getElementById("close-modal-button");

  const modalAvatar = document.getElementById("modal-avatar");

  const modalClientName = document.getElementById("modal-client-name");

  const modalClientPhone = document.getElementById("modal-client-phone");

  const modalVisits = document.getElementById("modal-visits");

  const modalSpend = document.getElementById("modal-spend");

  const modalLastVisit = document.getElementById("modal-last-visit");

  const clientHistoryList = document.getElementById("client-history-list");

  const historyEmpty = document.getElementById("history-empty");

  /* =======================================================
     ESTADO
  ======================================================= */

  let demoData = {
    clientes: [],
    agendamentos: [],
  };

  let clients = [];

  let currentFilter = "all";

  let searchTerm = "";

  /* =======================================================
     GARANTIR MODO ADMIN
  ======================================================= */

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

  function getInitials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "NU";
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getTodayTimestamp() {
    const today = new Date();

    today.setHours(23, 59, 59, 999);

    return today.getTime();
  }

  function appointmentTimestamp(appointment) {
    return new Date(
      `${appointment.data}T${appointment.horario || "12:00"}:00`,
    ).getTime();
  }

  function formatShortDate(dateString) {
    if (!dateString) {
      return "—";
    }

    const date = new Date(`${dateString}T12:00:00`);

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    })
      .format(date)
      .replace(".", "");
  }

  function formatFullDate(dateString) {
    if (!dateString) {
      return "—";
    }

    const date = new Date(`${dateString}T12:00:00`);

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(date);
  }

  /* =======================================================
     CARREGAR BASE
  ======================================================= */

  function loadData() {
    const stored = localStorage.getItem(DEMO_DATA_KEY);

    if (!stored) {
      return;
    }

    try {
      demoData = JSON.parse(stored);
    } catch (error) {
      demoData = {
        clientes: [],
        agendamentos: [],
      };
    }

    if (!Array.isArray(demoData.clientes)) {
      demoData.clientes = [];
    }

    if (!Array.isArray(demoData.agendamentos)) {
      demoData.agendamentos = [];
    }
  }

  /* =======================================================
     GARANTIR CLIENTES DOS AGENDAMENTOS
  ======================================================= */

  function ensureAppointmentClients() {
    demoData.agendamentos.forEach((appointment) => {
      if (!appointment.cliente) {
        return;
      }

      const exists = demoData.clientes.some((client) => {
        if (appointment.clienteId && client.id) {
          return String(client.id) === String(appointment.clienteId);
        }

        return (
          normalizeText(client.nome) === normalizeText(appointment.cliente)
        );
      });

      if (!exists) {
        demoData.clientes.push({
          id: appointment.clienteId || `demo-${Date.now()}-${Math.random()}`,

          nome: appointment.cliente,

          telefone: appointment.telefone || "",

          visitas: 0,
        });
      }
    });

    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
  }

  /* =======================================================
     HISTÓRICO DE UMA CLIENTE
  ======================================================= */

  function getClientAppointments(client) {
    return demoData.agendamentos
      .filter((appointment) => {
        if (appointment.status === "cancelado") {
          return false;
        }

        if (client.id && appointment.clienteId) {
          return String(client.id) === String(appointment.clienteId);
        }

        return (
          normalizeText(appointment.cliente) === normalizeText(client.nome)
        );
      })
      .sort(
        (first, second) =>
          appointmentTimestamp(second) - appointmentTimestamp(first),
      );
  }

  /* =======================================================
     MONTAR BASE ENRIQUECIDA
  ======================================================= */

  function buildClients() {
    const today = getTodayTimestamp();

    clients = demoData.clientes.map((client) => {
      const appointments = getClientAppointments(client);

      const completedOrPast = appointments.filter(
        (appointment) => appointmentTimestamp(appointment) <= today,
      );

      const calculatedVisits = completedOrPast.length;

      /*
              Mantemos também o número fictício
              original se ele for maior.
            */

      const visits = Math.max(Number(client.visitas || 0), calculatedVisits);

      const spend = appointments.reduce(
        (total, appointment) => total + Number(appointment.preco || 0),
        0,
      );

      const lastAppointment = appointments[0] || null;

      return {
        ...client,

        visits,
        spend,
        appointments,

        lastAppointment,

        lastVisit: lastAppointment ? lastAppointment.data : null,
      };
    });

    /*
      Ordena inicialmente pelas mais ativas.
    */

    clients.sort((first, second) => {
      if (second.visits !== first.visits) {
        return second.visits - first.visits;
      }

      return first.nome.localeCompare(second.nome, "pt-BR");
    });
  }

  /* =======================================================
     MÉTRICAS
  ======================================================= */

  function renderMetrics() {
    const totalClients = clients.length;

    const totalVisits = clients.reduce(
      (total, client) => total + Number(client.visits || 0),
      0,
    );

    const recurring = clients.filter((client) => client.visits >= 2).length;

    const revenue = demoData.agendamentos
      .filter((appointment) => appointment.status !== "cancelado")
      .reduce(
        (total, appointment) => total + Number(appointment.preco || 0),
        0,
      );

    metricClients.textContent = totalClients;

    metricVisits.textContent = totalVisits;

    metricRecurring.textContent = recurring;

    metricRevenue.textContent = formatCurrency(revenue);
  }

  /* =======================================================
     FILTROS
  ======================================================= */

  function getFilteredClients() {
    let result = [...clients];

    if (currentFilter === "recurring") {
      result = result.filter((client) => client.visits >= 2);
    }

    if (currentFilter === "recent") {
      result.sort((first, second) => {
        const firstDate = first.lastVisit
          ? new Date(`${first.lastVisit}T12:00:00`).getTime()
          : 0;

        const secondDate = second.lastVisit
          ? new Date(`${second.lastVisit}T12:00:00`).getTime()
          : 0;

        return secondDate - firstDate;
      });
    }

    if (searchTerm) {
      result = result.filter((client) => {
        const content = normalizeText(
          [client.nome, client.telefone, client.email].join(" "),
        );

        return content.includes(searchTerm);
      });
    }

    return result;
  }

  /* =======================================================
     CARD DE CLIENTE
  ======================================================= */

  function createClientCard(client) {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "client-card";

    const recurring = client.visits >= 2;

    const lastVisitLabel = client.lastVisit
      ? `Último: ${formatShortDate(client.lastVisit)}`
      : "Sem histórico";

    button.innerHTML = `

      <span class="client-avatar">
        ${getInitials(client.nome)}
      </span>


      <span class="client-card-content">

        <strong>
          ${client.nome}
        </strong>

        <span>
          ${client.telefone || "Telefone não informado"}
        </span>


        <span class="client-card-meta">

          <span>
            ${client.visits}
            ${client.visits === 1 ? "visita" : "visitas"}
          </span>

          <span class="meta-dot"></span>

          <span>
            ${lastVisitLabel}
          </span>

        </span>

      </span>


      <span class="client-card-side">

        <span class="client-spend">
          ${formatCurrency(client.spend)}
        </span>

        <span
          class="
            client-tag
            ${recurring ? "client-tag--recurring" : ""}
          "
        >
          ${recurring ? "Recorrente" : "Cliente"}
        </span>

      </span>

    `;

    button.addEventListener("click", () => {
      openClientModal(client);
    });

    return button;
  }

  /* =======================================================
     RENDERIZAR CLIENTES
  ======================================================= */

  function renderClients() {
    const filteredClients = getFilteredClients();

    clientsList.innerHTML = "";

    filteredClients.forEach((client) => {
      clientsList.appendChild(createClientCard(client));
    });

    const count = filteredClients.length;

    clientsCount.textContent = count === 1 ? "1 cliente" : `${count} clientes`;

    clientsList.hidden = count === 0;

    emptyState.hidden = count > 0;
  }

  /* =======================================================
     MODAL
  ======================================================= */

  function openClientModal(client) {
    modalAvatar.textContent = getInitials(client.nome);

    modalClientName.textContent = client.nome;

    modalClientPhone.textContent = client.telefone || "Telefone não informado";

    modalVisits.textContent = client.visits;

    modalSpend.textContent = formatCurrency(client.spend);

    modalLastVisit.textContent = client.lastVisit
      ? formatShortDate(client.lastVisit)
      : "—";

    renderClientHistory(client);

    clientModal.hidden = false;

    document.body.style.overflow = "hidden";
  }

  function closeClientModal() {
    clientModal.hidden = true;

    document.body.style.overflow = "";
  }

  /* =======================================================
     HISTÓRICO
  ======================================================= */

  function renderClientHistory(client) {
    clientHistoryList.innerHTML = "";

    const appointments = client.appointments;

    if (!appointments.length) {
      historyEmpty.hidden = false;

      clientHistoryList.hidden = true;

      return;
    }

    historyEmpty.hidden = true;

    clientHistoryList.hidden = false;

    appointments.forEach((appointment) => {
      const item = document.createElement("article");

      item.className = "history-item";

      item.innerHTML = `

          <span class="history-date">
            ${formatFullDate(appointment.data)}
          </span>


          <span class="history-info">

            <strong>
              ${appointment.servico}
            </strong>

            <span>
              ${appointment.horario}
              •
              ${appointment.status === "confirmado" ? "Confirmado" : "Pendente"}
            </span>

          </span>


          <strong class="history-price">
            ${formatCurrency(appointment.preco)}
          </strong>

        `;

      clientHistoryList.appendChild(item);
    });
  }

  /* =======================================================
     FECHAR MODAL
  ======================================================= */

  closeModalButton.addEventListener("click", closeClientModal);

  clientModal.addEventListener("click", (event) => {
    if (event.target === clientModal) {
      closeClientModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !clientModal.hidden) {
      closeClientModal();
    }
  });

  /* =======================================================
     PESQUISA
  ======================================================= */

  searchInput.addEventListener("input", () => {
    searchTerm = normalizeText(searchInput.value);

    clearSearchButton.hidden = !searchTerm;

    renderClients();
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  clearSearchButton.addEventListener("click", () => {
    searchInput.value = "";

    searchTerm = "";

    clearSearchButton.hidden = true;

    searchInput.focus();

    renderClients();
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

      renderClients();
    });
  });

  /* =======================================================
     INICIAR
  ======================================================= */

  function initialize() {
    loadData();

    ensureAppointmentClients();

    buildClients();

    renderMetrics();

    renderClients();
  }

  initialize();
});
