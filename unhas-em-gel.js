/* =========================================================
   NUVÉ STUDIO
   unhas-em-gel.js
   Protótipo demonstrativo - sem Firebase
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  /* =======================================================
     CONSTANTES
  ======================================================= */

  const DEMO_DATA_KEY = "nuve-demo-data";

  const SELECTION_KEY = "nuve-demo-selection";

  /* =======================================================
     ELEMENTOS
  ======================================================= */

  const serviceCards = document.querySelectorAll(".service-card");

  const selectionBar = document.getElementById("selection-bar");

  const selectedServiceName = document.getElementById("selected-service-name");

  const selectedServiceDetails = document.getElementById(
    "selected-service-details",
  );

  const continueButton = document.getElementById("continue-button");

  /* =======================================================
     ESTADO
  ======================================================= */

  let selectedService = null;

  /* =======================================================
     FORMATAR PREÇO
  ======================================================= */

  function formatCurrency(value) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  /* =======================================================
     FORMATAR DURAÇÃO
  ======================================================= */

  function formatDuration(minutes) {
    const totalMinutes = Number(minutes);

    const hours = Math.floor(totalMinutes / 60);

    const remainingMinutes = totalMinutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h${remainingMinutes}`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${remainingMinutes} min`;
  }

  /* =======================================================
     OBTER DADOS DO CARD
  ======================================================= */

  function getServiceFromCard(card) {
    return {
      id: Number(card.dataset.serviceId),

      categoria: card.dataset.serviceCategory,

      nome: card.dataset.serviceName,

      preco: Number(card.dataset.servicePrice),

      duracao: Number(card.dataset.serviceDuration),
    };
  }

  /* =======================================================
     REMOVER SELEÇÃO VISUAL
  ======================================================= */

  function clearVisualSelection() {
    serviceCards.forEach((card) => {
      card.classList.remove("is-selected");

      card.setAttribute("aria-pressed", "false");
    });
  }

  /* =======================================================
     SELECIONAR SERVIÇO
  ======================================================= */

  function selectService(card) {
    clearVisualSelection();

    card.classList.add("is-selected");

    card.setAttribute("aria-pressed", "true");

    selectedService = getServiceFromCard(card);

    updateSelectionBar();

    saveTemporarySelection();
  }

  /* =======================================================
     ATUALIZAR BARRA
  ======================================================= */

  function updateSelectionBar() {
    if (!selectedService) {
      selectionBar.hidden = true;

      return;
    }

    selectedServiceName.textContent = selectedService.nome;

    selectedServiceDetails.textContent = `${formatCurrency(
      selectedService.preco,
    )} • ${formatDuration(selectedService.duracao)}`;

    selectionBar.hidden = false;
  }

  /* =======================================================
     SALVAR SELEÇÃO
  ======================================================= */

  function saveTemporarySelection() {
    if (!selectedService) {
      return;
    }

    const selection = {
      categoria: selectedService.categoria,

      servicoId: selectedService.id,

      servico: selectedService.nome,

      preco: selectedService.preco,

      duracao: selectedService.duracao,

      data: null,

      horario: null,
    };

    localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  }

  /* =======================================================
     EVENTOS DOS CARDS
  ======================================================= */

  serviceCards.forEach((card) => {
    card.setAttribute("aria-pressed", "false");

    card.addEventListener("click", () => {
      selectService(card);
    });
  });

  /* =======================================================
     CONTINUAR
  ======================================================= */

  continueButton.addEventListener("click", () => {
    if (!selectedService) {
      return;
    }

    saveTemporarySelection();

    window.location.href = "agendamento.html";
  });

  /* =======================================================
     VERIFICAR SE O SERVIÇO EXISTE NOS DADOS DEMO
  ======================================================= */

  function ensureDemoServices() {
    const storedData = localStorage.getItem(DEMO_DATA_KEY);

    if (!storedData) {
      createBasicDemoData();

      return;
    }

    try {
      const demoData = JSON.parse(storedData);

      if (!Array.isArray(demoData.servicos)) {
        demoData.servicos = [];
      }

      const pageServices = Array.from(serviceCards).map(getServiceFromCard);

      pageServices.forEach((service) => {
        const exists = demoData.servicos.some(
          (item) => Number(item.id) === Number(service.id),
        );

        if (!exists) {
          demoData.servicos.push(service);
        }
      });

      localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
    } catch (error) {
      console.warn("Os dados demonstrativos foram recriados.");

      createBasicDemoData();
    }
  }

  /* =======================================================
     CRIAR BASE CASO A PRINCIPAL NÃO TENHA SIDO ABERTA
  ======================================================= */

  function createBasicDemoData() {
    const demoData = {
      studio: {
        name: "Nuvé Studio",
        professional: "Camila Santos",
      },

      clienteAtual: {
        id: 1,
        nome: "Marina Alves",
        telefone: "(11) 99999-1020",
        email: "marina@email.demo",
      },

      clientes: [
        {
          id: 1,
          nome: "Marina Alves",
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
      ],

      servicos: Array.from(serviceCards).map(getServiceFromCard),

      agendamentos: [
        {
          id: 1,
          clienteId: 1,
          cliente: "Marina Alves",
          servicoId: 2,
          servico: "Manutenção em Gel",
          data: "2026-08-12",
          horario: "14:30",
          preco: 110,
          status: "confirmado",
        },
      ],
    };

    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoData));
  }

  /* =======================================================
     RESTAURAR SELEÇÃO ANTERIOR
  ======================================================= */

  function restorePreviousSelection() {
    const storedSelection = localStorage.getItem(SELECTION_KEY);

    if (!storedSelection) {
      return;
    }

    try {
      const previousSelection = JSON.parse(storedSelection);

      if (previousSelection.categoria !== "Unhas em Gel") {
        return;
      }

      const matchingCard = Array.from(serviceCards).find(
        (card) =>
          Number(card.dataset.serviceId) ===
          Number(previousSelection.servicoId),
      );

      if (!matchingCard) {
        return;
      }

      selectService(matchingCard);
    } catch (error) {
      localStorage.removeItem(SELECTION_KEY);
    }
  }

  /* =======================================================
     INICIALIZAÇÃO
  ======================================================= */

  ensureDemoServices();

  restorePreviousSelection();
});
