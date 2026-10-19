// Preencha apenas com a configuração web pública do projeto Firebase da Nuvé.
// Nunca coloque aqui o JSON da conta de serviço ou qualquer chave privada.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};

export function firebaseEstaConfigurado() {
  return [firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId, firebaseConfig.appId]
    .every((value) => typeof value === "string" && value.length > 0);
}
