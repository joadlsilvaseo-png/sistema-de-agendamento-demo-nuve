/* =========================================================
   NUVÉ STUDIO
   agendamento.js
   Protótipo demonstrativo - sem Firebase
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     CHAVES
  ======================================================= */

  const DEMO_DATA_KEY = "nuve-demo-data";

  const SELECTION_KEY = "nuve-demo-selection";

  /* =======================================================
     ELEMENTOS
  ======================================================= */

  const backButton = document.getElementById("back-button");

  const changeServiceButton = document.getElementById("change-service-button");

  const serviceTitle = document.getElementById("service-summary-title");

  const serviceDuration = document.getElementById("selected-service-duration");

  const servicePrice = document.getElementById("selected-service-price");

  const dateList = document.getElementById("date-list");

  const previousDatesButton = document.getElementById("previous-dates-button");

  const nextDatesButton = document.getElementById("next-dates-button");

  const selectedDateLabel = document.getElementById("selected-date-label");

  const timeList = document.getElementById("time-list");

  const noTimesMessage = document.getElementById("no-times-message");

  const bookingFooter = document.getElementById("booking-footer");

  const bookingSummaryMain = document.getElementById("booking-summary-main");

  const bookingSummaryService = document.getElementById(
    "booking-summary-service",
  );

  const continueButton = document.getElementById("continue-button");

  /* =======================================================
     ESTADO
  ======================================================= */

  let selection = null;

  let demoData = null;

  let availableDates = [];

  let selectedDate = null;

  let selectedTime = null;

  let datePage = 0;

  /* =======================================================
     CONFIGURAÇÕES DA AGENDA
  ======================================================= */

  const DAYS_PER_PAGE =
    window.innerWidth >= 700 ? 5 : window.innerWidth <= 410 ? 3 : 4;

  const BASE_TIME_SLOTS = [
    "09:00",
    "09:30",

    "10:00",
    "10:30",

    "11:00",

    "13:00",
    "13:30",

    "14:00",
    "14:30",

    "15:00",
    "15:30",

    "16:00",
    "16:30",

    "17:00",
    "17:30",

    "18:00",
  ];

  /* =======================================================
     FORMATADORES
  ======================================================= */

  function formatCurrency(value) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDuration(minutes) {
    const total = Number(minutes);

    const hours = Math.floor(total / 60);

    const minutesLeft = total % 60;

    if (hours && minutesLeft) {
      return `${hours}h${minutesLeft}`;
    }

    if (hours) {
      return `${hours}h`;
    }

    return `${minutesLeft} min`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function toDateKey(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-");
  }

  function capitalize(text) {
    if (!text) {
      return "";
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /* =======================================================
     CARREGAR SELEÇÃO
  ======================================================= */

  function loadSelection() {
    const storedSelection = localStorage.getItem(SELECTION_KEY);

    if (!storedSelection) {
      window.location.href = "unhas-em-gel.html";

      return false;
    }

    try {
      selection = JSON.parse(storedSelection);

      if (!selection.servico || !selection.preco || !selection.duracao) {
        throw new Error("Seleção incompleta");
      }

      selectedDate = selection.data || null;

      selectedTime = selection.horario || null;

      return true;
    } catch (error) {
      localStorage.removeItem(SELECTION_KEY);

      window.location.href = "unhas-em-gel.html";

      return false;
    }
  }

  /* =======================================================
     CARREGAR BASE DEMO
  ======================================================= */

  function loadDemoData() {
    const storedData = localStorage.getItem(DEMO_DATA_KEY);

    if (!storedData) {
      demoData = {
        agendamentos: [],
      };

      return;
    }

    try {
      demoData = JSON.parse(storedData);

      if (!Array.isArray(demoData.agendamentos)) {
        demoData.agendamentos = [];
      }
    } catch (error) {
      demoData = {
        agendamentos: [],
      };
    }
  }

  /* =======================================================
     MOSTRAR SERVIÇO
  ======================================================= */

  function renderServiceSummary() {
    serviceTitle.textContent = selection.servico;

    serviceDuration.textContent = formatDuration(selection.duracao);

    servicePrice.textContent = formatCurrency(selection.preco);
  }

  /* =======================================================
     GERAR DATAS
  ======================================================= */

  function generateDates() {
    availableDates = [];

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    let dayOffset = 1;

    while (availableDates.length < 18) {
      const date = new Date(today);

      date.setDate(today.getDate() + dayOffset);

      const weekday = date.getDay();

      /*
        Domingo fechado
      */

      if (weekday !== 0) {
        availableDates.push(date);
      }

      dayOffset++;
    }
  }

  /* =======================================================
     RENDERIZAR DATAS
  ======================================================= */

  function renderDates() {
    dateList.innerHTML = "";

    const startIndex = datePage * DAYS_PER_PAGE;

    const currentDates = availableDates.slice(
      startIndex,
      startIndex + DAYS_PER_PAGE,
    );

    currentDates.forEach((date) => {
      const dateKey = toDateKey(date);

      const button = document.createElement("button");

      button.type = "button";

      button.className = "date-card";

      button.dataset.date = dateKey;

      const weekday = new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
      })
        .format(date)
        .replace(".", "");

      const month = new Intl.DateTimeFormat("pt-BR", {
        month: "short",
      })
        .format(date)
        .replace(".", "");

      button.innerHTML = `

          <span class="date-card-day">
            ${weekday}
          </span>

          <span class="date-card-number">
            ${date.getDate()}
          </span>

          <span class="date-card-month">
            ${month}
          </span>

        `;

      if (selectedDate === dateKey) {
        button.classList.add("is-selected");
      }

      button.addEventListener("click", () => {
        selectDate(dateKey);
      });

      dateList.appendChild(button);
    });

    previousDatesButton.disabled = datePage === 0;

    const lastIndex = startIndex + DAYS_PER_PAGE;

    nextDatesButton.disabled = lastIndex >= availableDates.length;
  }

  /* =======================================================
     SELECIONAR DATA
  ======================================================= */

  function selectDate(dateKey) {
    selectedDate = dateKey;

    selectedTime = null;

    selection.data = selectedDate;

    selection.horario = null;

    saveSelection();

    renderDates();

    renderSelectedDateLabel();

    renderTimes();

    updateFooter();
  }

  /* =======================================================
     LABEL DA DATA
  ======================================================= */

  function renderSelectedDateLabel() {
    if (!selectedDate) {
      selectedDateLabel.textContent = "Selecione uma data acima.";

      return;
    }

    const date = new Date(`${selectedDate}T12:00:00`);

    const formatted = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(date);

    selectedDateLabel.textContent = capitalize(formatted);
  }

  /* =======================================================
     VERIFICAR HORÁRIO OCUPADO
  ======================================================= */

  function isTimeOccupied(time) {
    if (!selectedDate) {
      return false;
    }

    return demoData.agendamentos.some((appointment) => {
      return (
        appointment.data === selectedDate &&
        appointment.horario === time &&
        appointment.status !== "cancelado"
      );
    });
  }

  /* =======================================================
     HORÁRIOS ESPECÍFICOS
  ======================================================= */

  function getAvailableSlotsForDate() {
    if (!selectedDate) {
      return [];
    }

    const date = new Date(`${selectedDate}T12:00:00`);

    const weekday = date.getDay();

    /*
      Sábado:
      agenda reduzida.
    */

    if (weekday === 6) {
      return [
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
      ];
    }

    return BASE_TIME_SLOTS;
  }

  /* =======================================================
     RENDERIZAR HORÁRIOS
  ======================================================= */

  function renderTimes() {
    timeList.innerHTML = "";

    if (!selectedDate) {
      noTimesMessage.hidden = true;

      return;
    }

    const slots = getAvailableSlotsForDate();

    if (!slots.length) {
      noTimesMessage.hidden = false;

      return;
    }

    noTimesMessage.hidden = true;

    slots.forEach((time) => {
      const button = document.createElement("button");

      button.type = "button";

      button.className = "time-button";

      button.textContent = time;

      const occupied = isTimeOccupied(time);

      if (occupied) {
        button.disabled = true;

        button.title = "Horário já ocupado";
      }

      if (selectedTime === time) {
        button.classList.add("is-selected");
      }

      button.addEventListener("click", () => {
        if (occupied) {
          return;
        }

        selectTime(time);
      });

      timeList.appendChild(button);
    });
  }

  /* =======================================================
     SELECIONAR HORÁRIO
  ======================================================= */

  function selectTime(time) {
    selectedTime = time;

    selection.horario = selectedTime;

    saveSelection();

    renderTimes();

    updateFooter();
  }

  /* =======================================================
     FOOTER
  ======================================================= */

  function updateFooter() {
    if (!selectedDate || !selectedTime) {
      bookingFooter.hidden = true;

      return;
    }

    const date = new Date(`${selectedDate}T12:00:00`);

    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    })
      .format(date)
      .replace(".", "");

    bookingSummaryMain.textContent = `${formattedDate} • ${selectedTime}`;

    bookingSummaryService.textContent = `${selection.servico} • ${formatCurrency(
      selection.preco,
    )}`;

    bookingFooter.hidden = false;
  }

  /* =======================================================
     SALVAR SELEÇÃO
  ======================================================= */

  function saveSelection() {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  }

  /* =======================================================
     RESTAURAR DATA
  ======================================================= */

  function restoreDatePage() {
    if (!selectedDate) {
      return;
    }

    const index = availableDates.findIndex(
      (date) => toDateKey(date) === selectedDate,
    );

    if (index === -1) {
      selectedDate = null;

      selectedTime = null;

      selection.data = null;

      selection.horario = null;

      saveSelection();

      return;
    }

    datePage = Math.floor(index / DAYS_PER_PAGE);
  }

  /* =======================================================
     NAVEGAÇÃO DAS DATAS
  ======================================================= */

  previousDatesButton.addEventListener("click", () => {
    if (datePage === 0) {
      return;
    }

    datePage--;

    renderDates();
  });

  nextDatesButton.addEventListener("click", () => {
    const nextStart = (datePage + 1) * DAYS_PER_PAGE;

    if (nextStart >= availableDates.length) {
      return;
    }

    datePage++;

    renderDates();
  });

  /* =======================================================
     ALTERAR SERVIÇO
  ======================================================= */

  changeServiceButton.addEventListener("click", () => {
    const category = selection.categoria;

    if (category === "Unhas em Gel") {
      window.location.href = "unhas-em-gel.html";

      return;
    }

    window.location.href = "principal.html";
  });

  /* =======================================================
     VOLTAR
  ======================================================= */

  backButton.addEventListener("click", () => {
    if (selection.categoria === "Unhas em Gel") {
      window.location.href = "unhas-em-gel.html";

      return;
    }

    window.location.href = "principal.html";
  });

  /* =======================================================
     CONTINUAR
  ======================================================= */

  continueButton.addEventListener("click", () => {
    if (!selectedDate || !selectedTime) {
      return;
    }

    saveSelection();

    window.location.href = "confirmacao.html";
  });

  /* =======================================================
     INICIAR
  ======================================================= */

  function initialize() {
    if (!loadSelection()) {
      return;
    }

    loadDemoData();

    renderServiceSummary();

    generateDates();

    restoreDatePage();

    renderDates();

    renderSelectedDateLabel();

    renderTimes();

    updateFooter();
  }

  initialize();
});
