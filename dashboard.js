/* =========================================================
   NUVÉ STUDIO
   dashboard.js
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

  const currentPeriod = document.getElementById("current-period");

  const metricRevenue = document.getElementById("metric-revenue");

  const metricTicket = document.getElementById("metric-ticket");

  const metricAppointments = document.getElementById("metric-appointments");

  const metricOccupancy = document.getElementById("metric-occupancy");

  const financialRealized = document.getElementById("financial-realized");

  const financialForecast = document.getElementById("financial-forecast");

  const financialTotal = document.getElementById("financial-total");

  const weeklyTotal = document.getElementById("weekly-total");

  const weeklyChart = document.getElementById("weekly-chart");

  const servicesRanking = document.getElementById("services-ranking");

  const activeClients = document.getElementById("active-clients");

  const recurringClients = document.getElementById("recurring-clients");

  const nextAppointments = document.getElementById("next-appointments");

  const appointmentsEmpty = document.getElementById("appointments-empty");

  /* =======================================================
     ESTADO
  ======================================================= */

  let demoData = {
    clientes: [],
    agendamentos: [],
    servicos: [],
  };

  /* =======================================================
     MODO ADMIN
  ======================================================= */

  localStorage.setItem(DEMO_MODE_KEY, "admin");

  /* =======================================================
     UTILITÁRIOS
  ======================================================= */

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateToKey(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join("-");
  }

  function dateFromKey(key) {
    return new Date(`${key}T12:00:00`);
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  }

  function getAppointmentTimestamp(appointment) {
    return new Date(
      `${appointment.data}T${appointment.horario || "12:00"}:00`,
    ).getTime();
  }

  function getStartOfWeek() {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    const day = date.getDay();

    const difference = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + difference);

    return date;
  }

  function getEndOfWeek() {
    const start = getStartOfWeek();

    const end = new Date(start);

    end.setDate(start.getDate() + 5);

    end.setHours(23, 59, 59, 999);

    return end;
  }

  function getMonthBounds() {
    const today = new Date();

    const start = new Date(today.getFullYear(), today.getMonth(), 1);

    const end = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return {
      start,
      end,
    };
  }

  /* =======================================================
     CARREGAR DADOS
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
        servicos: [],
      };
    }

    if (!Array.isArray(demoData.clientes)) {
      demoData.clientes = [];
    }

    if (!Array.isArray(demoData.agendamentos)) {
      demoData.agendamentos = [];
    }

    if (!Array.isArray(demoData.servicos)) {
      demoData.servicos = [];
    }
  }

  /* =======================================================
     DADOS HISTÓRICOS DA DEMO
  ======================================================= */

  function ensureAnalyticsDemoData() {
    const seedPrefix = "nuve-dashboard-seed-";

    const alreadySeeded = demoData.agendamentos.some((appointment) =>
      String(appointment.id).startsWith(seedPrefix),
    );

    if (alreadySeeded) {
      return;
    }

    const weekStart = getStartOfWeek();

    const clientPool = [
      {
        id: 1,
        nome: "Marina Alves",
      },
      {
        id: 2,
        nome: "Luiza Martins",
      },
      {
        id: 3,
        nome: "Beatriz Souza",
      },
      {
        id: 4,
        nome: "Fernanda Lima",
      },
      {
        id: 5,
        nome: "Juliana Rocha",
      },
    ];

    const services = [
      {
        id: 2,
        nome: "Manutenção em Gel",
        categoria: "Unhas em Gel",
        preco: 110,
        duracao: 90,
      },
      {
        id: 4,
        nome: "Manicure Completa",
        categoria: "Manicure",
        preco: 40,
        duracao: 50,
      },
      {
        id: 3,
        nome: "Banho de Gel",
        categoria: "Unhas em Gel",
        preco: 85,
        duracao: 75,
      },
      {
        id: 5,
        nome: "Pedicure Completa",
        categoria: "Pedicure",
        preco: 45,
        duracao: 60,
      },
      {
        id: 1,
        nome: "Alongamento em Gel",
        categoria: "Unhas em Gel",
        preco: 160,
        duracao: 120,
      },
    ];

    const seedConfiguration = [
      {
        day: 0,
        time: "09:00",
        client: 0,
        service: 1,
      },

      {
        day: 0,
        time: "14:00",
        client: 1,
        service: 0,
      },

      {
        day: 1,
        time: "10:30",
        client: 2,
        service: 2,
      },

      {
        day: 1,
        time: "15:00",
        client: 4,
        service: 1,
      },

      {
        day: 2,
        time: "13:30",
        client: 3,
        service: 4,
      },

      {
        day: 3,
        time: "10:00",
        client: 0,
        service: 3,
      },

      {
        day: 3,
        time: "16:00",
        client: 2,
        service: 0,
      },

      {
        day: 4,
        time: "11:00",
        client: 1,
        service: 2,
      },

      {
        day: 4,
        time: "15:30",
        client: 4,
        service: 1,
      },

      {
        day: 5,
        time: "09:30",
        client: 3,
        service: 0,
      },
    ];

    const now = Date.now();

    seedConfiguration.forEach((item, index) => {
      const date = new Date(weekStart);

      date.setDate(weekStart.getDate() + item.day);

      const appointmentDate = new Date(`${dateToKey(date)}T${item.time}:00`);

      /*
          Não criamos registros futuros
          como concluídos.
        */

      if (appointmentDate.getTime() > now) {
        return;
      }

      const client = clientPool[item.client];

      const service = services[item.service];

      demoData.agendamentos.push({
        id: `${seedPrefix}${index + 1}`,

        clienteId: client.id,

        cliente: client.nome,

        servicoId: service.id,

        categoria: service.categoria,

        servico: service.nome,

        data: dateToKey(date),

        horario: item.time,

        duracao: service.duracao,

        preco: service.preco,

        status: "confirmado",

        origem: "demo-dashboard",

        criadoEm: new Date().toISOString(),
      });
    });

    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
  }

  /* =======================================================
     PERÍODO
  ======================================================= */

  function renderCurrentPeriod() {
    const date = new Date();

    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(date);

    currentPeriod.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  }

  /* =======================================================
     AGENDAMENTOS VÁLIDOS
  ======================================================= */

  function getActiveAppointments() {
    return demoData.agendamentos.filter(
      (appointment) => appointment.status !== "cancelado",
    );
  }

  /* =======================================================
     KPIS
  ======================================================= */

  function renderMetrics() {
    const now = Date.now();

    const active = getActiveAppointments();

    const completed = active.filter(
      (appointment) =>
        appointment.status === "confirmado" &&
        getAppointmentTimestamp(appointment) <= now,
    );

    const revenue = completed.reduce(
      (total, appointment) => total + Number(appointment.preco || 0),
      0,
    );

    const forecast = active
      .filter((appointment) => getAppointmentTimestamp(appointment) > now)
      .reduce(
        (total, appointment) => total + Number(appointment.preco || 0),
        0,
      );

    const projectedTotal = revenue + forecast;

    const averageTicket = completed.length ? revenue / completed.length : 0;

    const month = getMonthBounds();

    const monthAppointments = active.filter((appointment) => {
      const timestamp = getAppointmentTimestamp(appointment);

      return (
        timestamp >= month.start.getTime() && timestamp <= month.end.getTime()
      );
    });

    const weekStart = getStartOfWeek().getTime();

    const weekEnd = getEndOfWeek().getTime();

    const weeklyAppointments = active.filter((appointment) => {
      const timestamp = getAppointmentTimestamp(appointment);

      return timestamp >= weekStart && timestamp <= weekEnd;
    });

    /*
      Capacidade demonstrativa:
      6 horários principais por dia,
      segunda a sábado.
    */

    const weeklyCapacity = 36;

    const occupancy = Math.min(
      100,
      Math.round((weeklyAppointments.length / weeklyCapacity) * 100),
    );

    metricRevenue.textContent = formatCurrency(revenue);

    financialRealized.textContent = formatCurrency(revenue);

    financialForecast.textContent = formatCurrency(forecast);

    financialTotal.textContent = formatCurrency(projectedTotal);

    metricTicket.textContent = formatCurrency(averageTicket);

    metricAppointments.textContent = monthAppointments.length;

    metricOccupancy.textContent = `${occupancy}%`;
  }

  /* =======================================================
     GRÁFICO DA SEMANA
  ======================================================= */

  function renderWeeklyChart() {
    weeklyChart.innerHTML = "";

    const start = getStartOfWeek();

    const active = getActiveAppointments();

    const days = [];

    for (let index = 0; index < 6; index++) {
      const date = new Date(start);

      date.setDate(start.getDate() + index);

      const key = dateToKey(date);

      const appointments = active.filter(
        (appointment) =>
          appointment.data === key &&
          appointment.status === "confirmado" &&
          getAppointmentTimestamp(appointment) <= Date.now(),
      );

      const revenue = appointments.reduce(
        (total, appointment) => total + Number(appointment.preco || 0),
        0,
      );

      days.push({
        date,
        revenue,
      });
    }

    const highestRevenue = Math.max(...days.map((day) => day.revenue), 1);

    const totalRevenue = days.reduce((total, day) => total + day.revenue, 0);

    weeklyTotal.textContent = formatCurrency(totalRevenue);

    days.forEach((day) => {
      const percentage =
        day.revenue === 0
          ? 3
          : Math.max(8, Math.round((day.revenue / highestRevenue) * 100));

      const weekday = new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
      })
        .format(day.date)
        .replace(".", "")
        .slice(0, 3);

      const column = document.createElement("div");

      column.className = "chart-column";

      column.innerHTML = `

          <span class="chart-value">
            ${day.revenue ? formatCurrency(day.revenue) : "—"}
          </span>


          <div class="chart-bar-wrapper">

            <div
              class="chart-bar"
              style="
                --bar-height:
                ${percentage}%;
              "
            ></div>

          </div>


          <span class="chart-day">
            ${weekday}
          </span>

        `;

      weeklyChart.appendChild(column);
    });
  }

  /* =======================================================
     SERVIÇOS MAIS PROCURADOS
  ======================================================= */

  function renderServiceRanking() {
    servicesRanking.innerHTML = "";

    const month = getMonthBounds();

    const appointments = getActiveAppointments().filter((appointment) => {
      const timestamp = getAppointmentTimestamp(appointment);

      return (
        timestamp >= month.start.getTime() && timestamp <= month.end.getTime()
      );
    });

    const map = {};

    appointments.forEach((appointment) => {
      const name = appointment.servico || "Serviço";

      if (!map[name]) {
        map[name] = 0;
      }

      map[name]++;
    });

    const ranking = Object.entries(map)
      .sort((first, second) => second[1] - first[1])
      .slice(0, 4);

    if (!ranking.length) {
      servicesRanking.innerHTML = `
        <div class="mini-empty-state">
          Nenhum serviço registrado.
        </div>
      `;

      return;
    }

    const highest = ranking[0][1];

    ranking.forEach(([name, count]) => {
      const percentage = Math.max(10, Math.round((count / highest) * 100));

      const item = document.createElement("div");

      item.className = "service-ranking-item";

      item.innerHTML = `

          <span class="service-ranking-name">
            ${name}
          </span>


          <span class="service-ranking-count">
            ${count}
            ${count === 1 ? "agendamento" : "agendamentos"}
          </span>


          <div class="service-ranking-track">

            <div
              class="service-ranking-fill"
              style="
                --ranking-width:
                ${percentage}%;
              "
            ></div>

          </div>

        `;

      servicesRanking.appendChild(item);
    });
  }

  /* =======================================================
     CLIENTES
  ======================================================= */

  function renderClientInsights() {
    const clients = demoData.clientes;

    activeClients.textContent = clients.length;

    const recurring = clients.filter(
      (client) => Number(client.visitas || 0) >= 2,
    ).length;

    recurringClients.textContent = recurring;
  }

  /* =======================================================
     PRÓXIMOS AGENDAMENTOS
  ======================================================= */

  function renderNextAppointments() {
    nextAppointments.innerHTML = "";

    const now = Date.now();

    const appointments = getActiveAppointments()
      .filter((appointment) => getAppointmentTimestamp(appointment) >= now)
      .sort(
        (first, second) =>
          getAppointmentTimestamp(first) - getAppointmentTimestamp(second),
      )
      .slice(0, 4);

    if (!appointments.length) {
      nextAppointments.hidden = true;

      appointmentsEmpty.hidden = false;

      return;
    }

    nextAppointments.hidden = false;

    appointmentsEmpty.hidden = true;

    appointments.forEach((appointment) => {
      const date = dateFromKey(appointment.data);

      const day = pad(date.getDate());

      const month = new Intl.DateTimeFormat("pt-BR", {
        month: "short",
      })
        .format(date)
        .replace(".", "")
        .toUpperCase();

      const item = document.createElement("article");

      item.className = "next-appointment-item";

      item.innerHTML = `

          <div class="next-appointment-date">

            <strong>
              ${day}
            </strong>

            <span>
              ${month}
            </span>

          </div>


          <div class="next-appointment-info">

            <strong>
              ${appointment.cliente}
            </strong>

            <span>
              ${appointment.servico}
            </span>

          </div>


          <span class="next-appointment-time">
            ${appointment.horario}
          </span>

        `;

      nextAppointments.appendChild(item);
    });
  }

  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  function initialize() {
    loadData();

    ensureAnalyticsDemoData();

    renderCurrentPeriod();

    renderMetrics();

    renderWeeklyChart();

    renderServiceRanking();

    renderClientInsights();

    renderNextAppointments();
  }

  initialize();
});
