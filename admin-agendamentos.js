/* =========================================================
   NUVÉ STUDIO
   admin-agendamentos.js
   Protótipo demonstrativo - sem Firebase
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     CHAVES
  ======================================================= */

  const DEMO_DATA_KEY = "nuve-demo-data";

  const LAST_BOOKING_KEY = "nuve-demo-last-booking";

  const DEMO_MODE_KEY = "nuve-demo-mode";

  /* =======================================================
     ELEMENTOS
  ======================================================= */

  const metricToday = document.getElementById("metric-today");

  const metricConfirmed = document.getElementById("metric-confirmed");

  const metricPending = document.getElementById("metric-pending");

  const metricRevenue = document.getElementById("metric-revenue");

  const latestBookingSection = document.getElementById(
    "latest-booking-section",
  );

  const latestBookingDay = document.getElementById("latest-booking-day");

  const latestBookingMonth = document.getElementById("latest-booking-month");

  const latestBookingClient = document.getElementById("latest-booking-client");

  const latestBookingService = document.getElementById(
    "latest-booking-service",
  );

  const latestBookingTime = document.getElementById("latest-booking-time");

  const searchForm = document.getElementById("search-form");

  const searchInput = document.getElementById("search-input");

  const clearSearchButton = document.getElementById("clear-search-button");

  const filterButtons = document.querySelectorAll(".filter-button");

  const appointmentsTitle = document.getElementById("appointments-title");

  const appointmentsCount = document.getElementById("appointments-count");

  const appointmentsList = document.getElementById("appointments-list");

  const emptyState = document.getElementById("empty-state");

  /* =======================================================
     ESTADO
  ======================================================= */

  let demoData = {
    agendamentos: [],
  };

  let lastBooking = null;

  let currentFilter = "upcoming";

  let searchTerm = "";

  /* =======================================================
     GARANTIR MODO ADMIN
  ======================================================= */

  localStorage.setItem(DEMO_MODE_KEY, "admin");

  /* =======================================================
     DATA ATUAL
  ======================================================= */

  function getTodayKey() {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /* =======================================================
     FORMATAR MOEDA
  ======================================================= */

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  }

  /* =======================================================
     FORMATAR DURAÇÃO
  ======================================================= */

  function formatDuration(minutes) {
    if (!minutes) {
      return "";
    }

    const total = Number(minutes);

    const hours = Math.floor(total / 60);

    const remaining = total % 60;

    if (hours && remaining) {
      return `${hours}h${remaining}`;
    }

    if (hours) {
      return `${hours}h`;
    }

    return `${remaining} min`;
  }

  /* =======================================================
     NORMALIZAR TEXTO
  ======================================================= */

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  /* =======================================================
     CARREGAR DADOS
  ======================================================= */

  function loadData() {
    const stored = localStorage.getItem(DEMO_DATA_KEY);

    if (stored) {
      try {
        demoData = JSON.parse(stored);
      } catch (error) {
        demoData = {
          agendamentos: [],
        };
      }
    }

    if (!Array.isArray(demoData.agendamentos)) {
      demoData.agendamentos = [];
    }

    const storedLastBooking = localStorage.getItem(LAST_BOOKING_KEY);

    if (storedLastBooking) {
      try {
        lastBooking = JSON.parse(storedLastBooking);
      } catch (error) {
        lastBooking = null;
      }
    }
  }

  /* =======================================================
     SALVAR
  ======================================================= */

  function saveData() {
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
  }

  /* =======================================================
     DATA + HORA PARA ORDENAÇÃO
  ======================================================= */

  function getAppointmentTimestamp(appointment) {
    return new Date(
      `${appointment.data}T${appointment.horario || "00:00"}:00`,
    ).getTime();
  }

  /* =======================================================
     MÉTRICAS
  ======================================================= */

  function renderMetrics() {
    const today = getTodayKey();

    const activeAppointments = demoData.agendamentos.filter(
      (appointment) => appointment.status !== "cancelado",
    );

    const upcoming = activeAppointments.filter(
      (appointment) => appointment.data >= today,
    );

    const todayAppointments = activeAppointments.filter(
      (appointment) => appointment.data === today,
    );

    const confirmed = upcoming.filter(
      (appointment) => appointment.status === "confirmado",
    );

    const pending = upcoming.filter(
      (appointment) => appointment.status === "pendente",
    );

    const revenue = upcoming.reduce(
      (total, appointment) => total + Number(appointment.preco || 0),
      0,
    );

    metricToday.textContent = todayAppointments.length;

    metricConfirmed.textContent = confirmed.length;

    metricPending.textContent = pending.length;

    metricRevenue.textContent = formatCurrency(revenue);
  }

  /* =======================================================
     ÚLTIMO AGENDAMENTO
  ======================================================= */

  function renderLatestBooking() {
    if (!lastBooking) {
      latestBookingSection.hidden = true;

      return;
    }

    const exists = demoData.agendamentos.some(
      (appointment) => String(appointment.id) === String(lastBooking.id),
    );

    if (!exists) {
      latestBookingSection.hidden = true;

      return;
    }

    const date = new Date(`${lastBooking.data}T12:00:00`);

    latestBookingDay.textContent = String(date.getDate()).padStart(2, "0");

    latestBookingMonth.textContent = new Intl.DateTimeFormat("pt-BR", {
      month: "short",
    })
      .format(date)
      .replace(".", "")
      .toUpperCase();

    latestBookingClient.textContent = lastBooking.cliente;

    latestBookingService.textContent = lastBooking.servico;

    latestBookingTime.textContent = lastBooking.horario;

    latestBookingSection.hidden = false;
  }

  /* =======================================================
     FILTRAR
  ======================================================= */

  function getFilteredAppointments() {
    const today = getTodayKey();

    let appointments = [...demoData.agendamentos];

    /* -----------------------------------------------------
       PERÍODO
    ----------------------------------------------------- */

    if (currentFilter === "today") {
      appointments = appointments.filter(
        (appointment) => appointment.data === today,
      );
    }

    if (currentFilter === "upcoming") {
      appointments = appointments.filter(
        (appointment) =>
          appointment.data >= today && appointment.status !== "cancelado",
      );
    }

    /* -----------------------------------------------------
       PESQUISA
    ----------------------------------------------------- */

    if (searchTerm) {
      appointments = appointments.filter((appointment) => {
        const searchable = normalizeText(
          [
            appointment.cliente,
            appointment.servico,
            appointment.categoria,
            appointment.horario,
            appointment.status,
          ].join(" "),
        );

        return searchable.includes(searchTerm);
      });
    }

    /* -----------------------------------------------------
       ORDEM
    ----------------------------------------------------- */

    appointments.sort((first, second) => {
      const firstTimestamp = getAppointmentTimestamp(first);

      const secondTimestamp = getAppointmentTimestamp(second);

      if (currentFilter === "all") {
        return secondTimestamp - firstTimestamp;
      }

      return firstTimestamp - secondTimestamp;
    });

    return appointments;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  function getStatusLabel(status) {
    const labels = {
      confirmado: "Confirmado",
      pendente: "Pendente",
      cancelado: "Cancelado",
    };

    return labels[status] || status;
  }

  function getStatusClass(status) {
    if (status === "confirmado") {
      return "status-badge--confirmed";
    }

    if (status === "pendente") {
      return "status-badge--pending";
    }

    return "status-badge--cancelled";
  }

  /* =======================================================
     CRIAR CARD
  ======================================================= */

  function createAppointmentCard(appointment) {
    const card = document.createElement("article");

    card.className = "appointment-card";

    card.dataset.id = appointment.id;

    if (lastBooking && String(lastBooking.id) === String(appointment.id)) {
      card.classList.add("is-latest");
    }

    const date = new Date(`${appointment.data}T12:00:00`);

    const day = String(date.getDate()).padStart(2, "0");

    const month = new Intl.DateTimeFormat("pt-BR", {
      month: "short",
    })
      .format(date)
      .replace(".", "")
      .toUpperCase();

    const weekday = new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
    })
      .format(date)
      .replace(".", "");

    const duration = formatDuration(appointment.duracao);

    const price = formatCurrency(appointment.preco);

    const statusClass = getStatusClass(appointment.status);

    const statusLabel = getStatusLabel(appointment.status);

    let actionButtons = "";

    if (appointment.status === "pendente") {
      actionButtons += `

        <button
          type="button"
          class="
            appointment-action-button
            appointment-action-button--confirm
          "
          data-action="confirm"
        >

          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M6 12L10 16L18 8"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          Confirmar

        </button>

      `;
    }

    if (appointment.status !== "cancelado") {
      actionButtons += `

        <button
          type="button"
          class="
            appointment-action-button
            appointment-action-button--cancel
          "
          data-action="cancel"
        >
          Cancelar
        </button>

      `;
    }

    if (appointment.status === "cancelado") {
      actionButtons += `

        <button
          type="button"
          class="
            appointment-action-button
            appointment-action-button--confirm
          "
          data-action="restore"
        >
          Restaurar
        </button>

      `;
    }

    card.innerHTML = `

      <div class="appointment-main">

        <div class="appointment-date-block">

          <strong>
            ${day}
          </strong>

          <span>
            ${month}
          </span>

        </div>


        <div class="appointment-information">

          <span class="appointment-time">
            ${weekday} • ${appointment.horario}
          </span>

          <strong>
            ${appointment.cliente}
          </strong>

          <span>
            ${appointment.servico}
          </span>

          <div class="appointment-meta">

            ${duration ? `<span>${duration}</span>` : ""}

            ${duration ? `<span class="appointment-meta-dot"></span>` : ""}

            <span>
              ${price}
            </span>

          </div>

        </div>


        <span
          class="
            status-badge
            ${statusClass}
          "
        >
          ${statusLabel}
        </span>

      </div>


      <div class="appointment-actions">

        ${actionButtons}

      </div>

    `;

    card.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        handleAppointmentAction(appointment.id, button.dataset.action);
      });
    });

    return card;
  }

  /* =======================================================
     AÇÕES
  ======================================================= */

  function handleAppointmentAction(appointmentId, action) {
    const appointment = demoData.agendamentos.find(
      (item) => String(item.id) === String(appointmentId),
    );

    if (!appointment) {
      return;
    }

    if (action === "confirm") {
      appointment.status = "confirmado";
    }

    if (action === "cancel") {
      appointment.status = "cancelado";
    }

    if (action === "restore") {
      appointment.status = "confirmado";
    }

    saveData();

    renderAll();
  }

  /* =======================================================
     RENDERIZAR LISTA
  ======================================================= */

  function renderAppointments() {
    const appointments = getFilteredAppointments();

    appointmentsList.innerHTML = "";

    appointments.forEach((appointment) => {
      appointmentsList.appendChild(createAppointmentCard(appointment));
    });

    const count = appointments.length;

    appointmentsCount.textContent =
      count === 1 ? "1 agendamento" : `${count} agendamentos`;

    emptyState.hidden = count > 0;

    appointmentsList.hidden = count === 0;

    updateSectionTitle();
  }

  /* =======================================================
     TÍTULO
  ======================================================= */

  function updateSectionTitle() {
    if (currentFilter === "today") {
      appointmentsTitle.textContent = "Atendimentos de hoje";

      return;
    }

    if (currentFilter === "all") {
      appointmentsTitle.textContent = "Todos os agendamentos";

      return;
    }

    appointmentsTitle.textContent = "Próximos atendimentos";
  }

  /* =======================================================
     PESQUISA
  ======================================================= */

  searchInput.addEventListener("input", () => {
    searchTerm = normalizeText(searchInput.value);

    clearSearchButton.hidden = !searchTerm;

    renderAppointments();
  });

  clearSearchButton.addEventListener("click", () => {
    searchInput.value = "";

    searchTerm = "";

    clearSearchButton.hidden = true;

    searchInput.focus();

    renderAppointments();
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
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

      renderAppointments();
    });
  });

  /* =======================================================
     RENDER GERAL
  ======================================================= */

  function renderAll() {
    renderMetrics();

    renderLatestBooking();

    renderAppointments();
  }

  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  function initialize() {
    loadData();

    renderAll();
  }

  initialize();
});
