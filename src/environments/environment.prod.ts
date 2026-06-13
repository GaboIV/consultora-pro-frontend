import { APP_VERSION } from '../version';

export const environment = {
  production: true,
  useMockData: false,
  apiBaseUrl: 'https://localhost:7001/api',
  // Cuando es false se oculta todo el módulo de Despliegues y la salud de
  // pipelines / CI-CD (esta instalación maneja despliegues de forma manual).
  showDeployments: false,
  appVersion: APP_VERSION,
};
