export const environment = {
  production: false,
  useMockData: false,
  apiBaseUrl: 'https://localhost:7001/api',
  // Cuando es false se oculta todo el módulo de Despliegues y la salud de
  // pipelines / CI-CD (esta instalación maneja despliegues de forma manual).
  showDeployments: false
};
