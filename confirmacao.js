/* =========================================================
   NUVÉ STUDIO
   confirmacao.js
   Protótipo demonstrativo - sem Firebase
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     CHAVES
  ======================================================= */

  const DEMO_DATA_KEY = "nuve-demo-data";

  const SELECTION_KEY = "nuve-demo-selection";

  const DEMO_MODE_KEY = "nuve-demo-mode";

  const LAST_BOOKING_KEY = "nuve-demo-last-booking";

  /* =======================================================
     ELEMENTOS
  ======================================================= */

  const confirmationContent = document.getElementById("confirmation-content");

  const successContent = document.getElementById("success-content");

  const confirmationFooter = document.getElementById("confirmation-footer");

  const backButton = document.getElementById("back-button");

  const clientInitials = document.getElementById("client-initials");

  const clientName = document.getElementById("client-name");

  const clientPhone = document.getElementById("client-phone");

  const summaryService = document.getElementById("summary-service");

  const summaryCategory = document.getElementById("summary-category");

  const summaryDate = document.getElementById("summary-date");

  const summaryWeekday = document.getElementById("summary-weekday");

  const summaryTime = document.getElementById("summary-time");

  const summaryDuration = document.getElementById("summary-duration");

  const summaryPrice = document.getElementById("summary-price");

  const footerPrice = document.getElementById("footer-price");

  const editBookingButton = document.getElementById("edit-booking-button");

  const confirmButton = document.getElementById("confirm-button");

  const successService = document.getElementById("success-service");

  const successDateTime = document.getElementById("success-date-time");

  const successPrice = document.getElementById("success-price");

  const adminViewButton = document.getElementById("admin-view-button");

  /* =======================================================
     ESTADO
  ======================================================= */

  let selection = null;

  let demoData = null;

  let currentClient = null;

  let confirmedBooking = null;

  /* =======================================================
     FORMATAR PREÇO
  ======================================================= */

  function formatCurrency(value) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  /* =======================================================
     FORMATAR DURAÇÃO
  ======================================================= */

  function formatDuration(minutes) {
    const total = Number(minutes);

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
     INICIAIS
  ======================================================= */

  function getInitials(name) {
    if (!name) {
      return "NU";
    }

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* =======================================================
     CARREGAR SELEÇÃO
  ======================================================= */

  function loadSelection() {
    const stored = localStorage.getItem(SELECTION_KEY);

    if (!stored) {
      redirectToStart();

      return false;
    }

    try {
      selection = JSON.parse(stored);

      if (
        !selection.servico ||
        !selection.data ||
        !selection.horario ||
        selection.preco === undefined
      ) {
        throw new Error("Dados incompletos");
      }

      return true;
    } catch (error) {
      localStorage.removeItem(SELECTION_KEY);

      redirectToStart();

      return false;
    }
  }

  /* =======================================================
     CARREGAR BASE
  ======================================================= */

  function loadDemoData() {
    const stored = localStorage.getItem(DEMO_DATA_KEY);

    if (!stored) {
      demoData = {
        clientes: [],
        agendamentos: [],
      };

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
     CLIENTE ATUAL
  ======================================================= */

  function loadCurrentClient() {
    currentClient = demoData.clienteAtual;

    if (!currentClient) {
      currentClient = {
        id: 1,
        nome: "Marina Alves",
        telefone: "(11) 99999-1020",
        email: "marina@email.demo",
      };
    }
  }

  /* =======================================================
     DATA
  ======================================================= */

  function getAppointmentDate() {
    return new Date(`${selection.data}T12:00:00`);
  }

  function formatFullDate() {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(getAppointmentDate());
  }

  function formatWeekday() {
    const value = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
    }).format(getAppointmentDate());

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatShortDate() {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    })
      .format(getAppointmentDate())
      .replace(".", "");
  }

  /* =======================================================
     RENDERIZAR
  ======================================================= */

  function renderConfirmation() {
    clientName.textContent = currentClient.nome;

    clientPhone.textContent = currentClient.telefone || "";

    clientInitials.textContent = getInitials(currentClient.nome);

    summaryService.textContent = selection.servico;

    summaryCategory.textContent = selection.categoria || "Serviço";

    summaryDate.textContent = formatFullDate();

    summaryWeekday.textContent = formatWeekday();

    summaryTime.textContent = selection.horario;

    summaryDuration.textContent = `Duração aproximada: ${formatDuration(
      selection.duracao,
    )}`;

    summaryPrice.textContent = formatCurrency(selection.preco);

    footerPrice.textContent = formatCurrency(selection.preco);
  }

  /* =======================================================
     VERIFICAR SE HORÁRIO CONTINUA LIVRE
  ======================================================= */

  function isSlotOccupied() {
    return demoData.agendamentos.some((appointment) => {
      return (
        appointment.data === selection.data &&
        appointment.horario === selection.horario &&
        appointment.status !== "cancelado"
      );
    });
  }

  /* =======================================================
     CRIAR AGENDAMENTO
  ======================================================= */

  function createBooking() {
    if (isSlotOccupied()) {
      alert(
        "Esse horário já foi ocupado na demonstração. Escolha outro horário.",
      );

      window.location.href = "agendamento.html";

      return;
    }

    confirmedBooking = {
      id: Date.now(),

      clienteId: currentClient.id,

      cliente: currentClient.nome,

      telefone: currentClient.telefone || "",

      servicoId: selection.servicoId,

      categoria: selection.categoria,

      servico: selection.servico,

      data: selection.data,

      horario: selection.horario,

      duracao: Number(selection.duracao),

      preco: Number(selection.preco),

      status: "confirmado",

      origem: "demo-cliente",

      criadoEm: new Date().toISOString(),
    };

    demoData.agendamentos.push(confirmedBooking);

    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));

    localStorage.setItem(LAST_BOOKING_KEY, JSON.stringify(confirmedBooking));

    /*
      Limpa a seleção para não criar
      o mesmo agendamento novamente.
    */

    localStorage.removeItem(SELECTION_KEY);

    showSuccess();
  }

  /* =======================================================
     SUCESSO
  ======================================================= */

  function showSuccess() {
    confirmationContent.hidden = true;

    confirmationFooter.hidden = true;

    successContent.hidden = false;

    successService.textContent = confirmedBooking.servico;

    successDateTime.textContent = `${formatShortDate()} • ${confirmedBooking.horario}`;

    successPrice.textContent = formatCurrency(confirmedBooking.preco);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     VOLTAR
  ======================================================= */

  function redirectToStart() {
    window.location.href = "principal.html";
  }

  backButton.addEventListener("click", () => {
    window.location.href = "agendamento.html";
  });

  /* =======================================================
     ALTERAR
  ======================================================= */

  editBookingButton.addEventListener("click", () => {
    window.location.href = "agendamento.html";
  });

  /* =======================================================
     CONFIRMAR
  ======================================================= */

  confirmButton.addEventListener("click", () => {
    confirmButton.disabled = true;

    confirmButton.innerHTML = `
        <span>
          Confirmando...
        </span>
      `;

    /*
        Pequeno atraso apenas para dar
        sensação de processamento real.
      */

    setTimeout(() => {
      createBooking();
    }, 350);
  });

  /* =======================================================
     VER COMO ADMIN
  ======================================================= */

  adminViewButton.addEventListener("click", () => {
    localStorage.setItem(DEMO_MODE_KEY, "admin");

    window.location.href = "principal.html";
  });

  /* =======================================================
     INICIAR
  ======================================================= */

  function initialize() {
    if (!loadSelection()) {
      return;
    }

    loadDemoData();

    loadCurrentClient();

    renderConfirmation();
  }

  initialize();
});
