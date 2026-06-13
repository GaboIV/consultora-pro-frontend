import { APP_VERSION } from '../version';

export const environment = {
  production: true,
  useMockData: false,
  // Ruta relativa: el SPA llama a /api/... (mismo origen) y el Nginx del
  // contenedor frontend lo reenvia al backend por la red interna de Docker.
  // El backend NO se expone directamente. Ver docs/07-nginx-proxy-inverso.md
  apiBaseUrl: '/api',
  // Cuando es false se oculta todo el módulo de Despliegues y la salud de
  // pipelines / CI-CD (esta instalación maneja despliegues de forma manual).
  showDeployments: false,
  appVersion: APP_VERSION,
};
