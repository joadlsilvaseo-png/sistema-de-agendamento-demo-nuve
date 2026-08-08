/* =========================================================
   NUVÉ STUDIO
   meu-perfil.js
   Protótipo demonstrativo - sem Firebase
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const DEMO_DATA_KEY = "nuve-demo-data";

  const FALLBACK_CLIENT = {
    id: 1,
    nome: "Isabele Mariana Vieira",
    telefone: "(11) 99999-1020",
    email: "isabele@email.demo",
    visitas: 8,
  };


  /* =======================================================
     ELEMENTOS
  ======================================================= */

  const profileName = document.getElementById("profile-name");
  const profileInitials = document.getElementById("profile-initials");

  const summaryVisits = document.getElementById("summary-visits");
  const summaryFavorite = document.getElementById("summary-favorite");

  const nextAppointmentCard = document.getElementById("next-appointment-card");
  const emptyAppointment = document.getElementById("empty-appointment");

  const nextDay = document.getElementById("next-day");
  const nextMonth = document.getElementById("next-month");
  const nextService = document.getElementById("next-service");
  const nextDateText = document.getElementById("next-date-text");
  const nextStatus = document.getElementById("next-status");

  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");

  const profileForm = document.getElementById("profile-form");
  const profileNameInput = document.getElementById("profile-name-input");
  const profilePhoneInput = document.getElementById("profile-phone-input");
  const profileEmailInput = document.getElementById("profile-email-input");

  const editProfileButton = document.getElementById("edit-profile-button");
  const cancelEditButton = document.getElementById("cancel-edit-button");
  const formActions = document.getElementById("form-actions");
  const saveFeedback = document.getElementById("save-feedback");

  const agendaNavigation = document.querySelector('[data-navigation="agenda"]');
  const profileNavigation = document.querySelector('[data-navigation="profile"]');


  /* =======================================================
     UTILITÁRIOS
  ======================================================= */

  function getDemoData() {
    try {
      const storedData = localStorage.getItem(DEMO_DATA_KEY);

      if (!storedData) {
        return null;
      }

      return JSON.parse(storedData);
    } catch (error) {
      console.warn("Não foi possível ler os dados demonstrativos.", error);

      return null;
    }
  }


  function saveDemoData(data) {
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
  }


  function normalizeStatus(status = "") {
    return String(status)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }


  function getInitials(name = "") {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "NU";
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }


  function parseLocalDate(dateString) {
    if (!dateString) {
      return null;
    }

    const parts = dateString.split("-").map(Number);

    if (parts.length !== 3) {
      return null;
    }

    const [year, month, day] = parts;

    return new Date(year, month - 1, day);
  }


  function getDateTime(appointment) {
    const date = parseLocalDate(appointment.data);

    if (!date) {
      return new Date(0);
    }

    const [hours = 0, minutes = 0] = String(appointment.horario || "00:00")
      .split(":")
      .map(Number);

    date.setHours(hours, minutes, 0, 0);

    return date;
  }


  function formatWeekday(date) {
    const value = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
    }).format(date);

    return value.charAt(0).toUpperCase() + value.slice(1);
  }


  function formatMonth(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "short",
    })
      .format(date)
      .replace(".", "")
      .toUpperCase();
  }


  function formatShortDate(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  }


  function formatStatus(status) {
    const normalized = normalizeStatus(status);

    if (normalized === "confirmado" || normalized === "confirmada") {
      return "Confirmado";
    }

    if (normalized === "concluido" || normalized === "concluida") {
      return "Concluído";
    }

    if (normalized === "cancelado" || normalized === "cancelada") {
      return "Cancelado";
    }

    if (normalized === "pendente") {
      return "Pendente";
    }

    return status || "Agendado";
  }


  /* =======================================================
     CLIENTE ATUAL
  ======================================================= */

  function getCurrentClient(data) {
    if (!data) {
      return { ...FALLBACK_CLIENT };
    }

    const currentClient = data.clienteAtual || {};

    const clients = Array.isArray(data.clientes) ? data.clientes : [];

    const registeredClient = clients.find((client) => {
      return Number(client.id) === Number(currentClient.id);
    });

    return {
      ...FALLBACK_CLIENT,
      ...(registeredClient || {}),
      ...currentClient,
    };
  }


  /* =======================================================
     PERFIL
  ======================================================= */

  function renderProfile(client) {
    profileName.textContent = client.nome || FALLBACK_CLIENT.nome;

    profileInitials.textContent = getInitials(
      client.nome || FALLBACK_CLIENT.nome
    );

    profileNameInput.value = client.nome || "";
    profilePhoneInput.value = client.telefone || "";
    profileEmailInput.value = client.email || "";

    summaryVisits.textContent = Number(client.visitas || 0);
  }


  /* =======================================================
     AGENDAMENTOS
  ======================================================= */

  function getClientAppointments(data, client) {
    if (!data || !Array.isArray(data.agendamentos)) {
      return [];
    }

    return data.agendamentos.filter((appointment) => {
      if (appointment.clienteId !== undefined && client.id !== undefined) {
        return Number(appointment.clienteId) === Number(client.id);
      }

      return appointment.cliente === client.nome;
    });
  }


  function renderNextAppointment(appointments) {
    const now = new Date();

    const upcomingAppointments = appointments
      .filter((appointment) => {
        const status = normalizeStatus(appointment.status);

        const isCancelled =
          status === "cancelado" ||
          status === "cancelada";

        return !isCancelled && getDateTime(appointment) >= now;
      })
      .sort((a, b) => getDateTime(a) - getDateTime(b));

    const nextAppointment = upcomingAppointments[0];

    if (!nextAppointment) {
      nextAppointmentCard.hidden = true;
      nextStatus.hidden = true;
      emptyAppointment.hidden = false;

      return;
    }

    const date = getDateTime(nextAppointment);

    nextAppointmentCard.hidden = false;
    nextStatus.hidden = false;
    emptyAppointment.hidden = true;

    nextDay.textContent = String(date.getDate()).padStart(2, "0");
    nextMonth.textContent = formatMonth(date);

    nextService.textContent =
      nextAppointment.servico ||
      "Atendimento Nuvé Studio";

    nextDateText.textContent =
      `${formatWeekday(date)} • ${nextAppointment.horario || "--:--"}`;

    nextStatus.textContent = formatStatus(nextAppointment.status);
  }


  function renderHistory(appointments) {
    const now = new Date();

    const completedAppointments = appointments
      .filter((appointment) => {
        const status = normalizeStatus(appointment.status);

        const isCompleted =
          status === "concluido" ||
          status === "concluida";

        const isPast =
          getDateTime(appointment) < now &&
          status !== "cancelado" &&
          status !== "cancelada";

        return isCompleted || isPast;
      })
      .sort((a, b) => getDateTime(b) - getDateTime(a))
      .slice(0, 4);

    historyList.innerHTML = "";

    if (!completedAppointments.length) {
      historyEmpty.hidden = false;

      return;
    }

    historyEmpty.hidden = true;

    completedAppointments.forEach((appointment) => {
      const date = getDateTime(appointment);

      const card = document.createElement("article");

      card.className = "history-card";

      card.innerHTML = `
        <span class="history-date">
          ${formatShortDate(date)}
        </span>

        <span class="history-content">
          <strong>${appointment.servico || "Atendimento"}</strong>
          <span>${appointment.horario || "--:--"} • Nuvé Studio</span>
        </span>

        <span class="history-status">
          Concluído
        </span>
      `;

      historyList.appendChild(card);
    });
  }


  function renderFavoriteService(appointments) {
    if (!appointments.length) {
      summaryFavorite.textContent = "Gel";

      return;
    }

    const counts = {};

    appointments.forEach((appointment) => {
      const service = appointment.servico || "Cuidado";

      const key = service
        .replace(/em gel/gi, "Gel")
        .replace(/completa/gi, "")
        .trim();

      counts[key] = (counts[key] || 0) + 1;
    });

    const favorite = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];

    summaryFavorite.textContent = favorite ? favorite[0] : "Gel";
  }


  /* =======================================================
     EDIÇÃO
  ======================================================= */

  function setEditingMode(isEditing) {
    profileNameInput.disabled = !isEditing;
    profilePhoneInput.disabled = !isEditing;
    profileEmailInput.disabled = !isEditing;

    formActions.hidden = !isEditing;

    editProfileButton.hidden = isEditing;

    saveFeedback.hidden = true;

    if (isEditing) {
      profileNameInput.focus();
    }
  }


  editProfileButton.addEventListener("click", () => {
    setEditingMode(true);
  });


  cancelEditButton.addEventListener("click", () => {
    const data = getDemoData();

    const client = getCurrentClient(data);

    renderProfile(client);

    setEditingMode(false);
  });


  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = getDemoData();

    if (!data) {
      setEditingMode(false);

      saveFeedback.hidden = false;

      return;
    }

    const updatedName =
      profileNameInput.value.trim() ||
      FALLBACK_CLIENT.nome;

    const updatedPhone =
      profilePhoneInput.value.trim();

    const updatedEmail =
      profileEmailInput.value.trim();

    const currentClient = getCurrentClient(data);

    data.clienteAtual = {
      ...(data.clienteAtual || {}),
      nome: updatedName,
      telefone: updatedPhone,
      email: updatedEmail,
    };

    if (Array.isArray(data.clientes)) {
      const index = data.clientes.findIndex((client) => {
        return Number(client.id) === Number(currentClient.id);
      });

      if (index >= 0) {
        data.clientes[index] = {
          ...data.clientes[index],
          nome: updatedName,
          telefone: updatedPhone,
        };
      }
    }

    if (Array.isArray(data.agendamentos)) {
      data.agendamentos = data.agendamentos.map((appointment) => {
        if (Number(appointment.clienteId) === Number(currentClient.id)) {
          return {
            ...appointment,
            cliente: updatedName,
          };
        }

        return appointment;
      });
    }

    saveDemoData(data);

    const updatedClient = getCurrentClient(data);

    renderProfile(updatedClient);

    setEditingMode(false);

    saveFeedback.hidden = false;

    window.setTimeout(() => {
      saveFeedback.hidden = true;
    }, 2600);
  });


  /* =======================================================
     NAVEGAÇÃO
  ======================================================= */

  function updateNavigationState() {
    const isAgendaHash =
      window.location.hash === "#meus-agendamentos";

    agendaNavigation.classList.toggle(
      "client-navigation-item--active",
      isAgendaHash
    );

    profileNavigation.classList.toggle(
      "client-navigation-item--active",
      !isAgendaHash
    );
  }


  window.addEventListener("hashchange", updateNavigationState);


  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  const demoData = getDemoData();

  const currentClient = getCurrentClient(demoData);

  const appointments = getClientAppointments(
    demoData,
    currentClient
  );

  renderProfile(currentClient);

  renderNextAppointment(appointments);

  renderHistory(appointments);

  renderFavoriteService(appointments);

  updateNavigationState();

});
