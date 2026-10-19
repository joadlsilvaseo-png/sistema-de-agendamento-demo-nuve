// A demonstração é o padrão seguro para Live Server e para a demo pública.
// Uma instalação conectada deve declarar explicitamente mode: "connected".
// Isso seleciona o fluxo de interface, mas nunca substitui a autenticação no backend.
window.NUVE_RUNTIME_CONFIG = Object.freeze({ mode: "demo", apiBaseUrl: "" });
