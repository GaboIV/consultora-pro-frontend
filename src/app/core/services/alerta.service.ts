import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Alerta } from '../models/alerta.models';
import { ApiResponse } from '../models/security.models';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly api = environment.apiBaseUrl;

  private readonly alertsSignal = signal<Alerta[]>([]);
  private readonly readIdsSignal = signal<string[]>(this.loadReadIds());
  private pollingSub: Subscription | null = null;
  private shownSnackbarAlerts = new Set<string>();

  readonly alerts = computed(() => {
    const rawAlerts = this.alertsSignal();
    const readIds = this.readIdsSignal();
    return rawAlerts.map(a => ({
      ...a,
      leida: readIds.includes(a.id)
    }));
  });

  readonly unreadCount = computed(() => {
    return this.alerts().filter(a => !a.leida).length;
  });

  constructor() {
    // Listen to auth changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    });
  }

  private loadReadIds(): string[] {
    try {
      return JSON.parse(localStorage.getItem('consultorapro_read_alerts') || '[]');
    } catch {
      return [];
    }
  }

  private saveReadIds(ids: string[]): void {
    localStorage.setItem('consultorapro_read_alerts', JSON.stringify(ids));
    this.readIdsSignal.set(ids);
  }

  startPolling(): void {
    this.stopPolling();
    this.fetchAlerts();

    // Poll every 5 minutes (300,000 ms)
    this.pollingSub = interval(300000).subscribe(() => {
      this.fetchAlerts();
    });
  }

  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
    this.alertsSignal.set([]);
    this.shownSnackbarAlerts.clear();
  }

  fetchAlerts(): void {
    this.http.get<ApiResponse<Alerta[]>>(`${this.api}/alertas`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.alertsSignal.set(res.data);
          this.checkCriticalAlerts(res.data);
        }
      },
      error: (err) => console.error('Error fetching alerts:', err)
    });
  }

  markAsRead(id: string): void {
    const current = this.readIdsSignal();
    if (!current.includes(id)) {
      const next = [...current, id];
      this.saveReadIds(next);
    }
  }

  markAllAsRead(): void {
    const allIds = this.alertsSignal().map(a => a.id);
    this.saveReadIds(allIds);
  }

  private checkCriticalAlerts(alerts: Alerta[]): void {
    const unreadCriticalAlerts = alerts.filter(
      a => a.esCritica && !this.readIdsSignal().includes(a.id) && !this.shownSnackbarAlerts.has(a.id)
    );

    if (unreadCriticalAlerts.length > 0) {
      unreadCriticalAlerts.forEach(a => this.shownSnackbarAlerts.add(a.id));
      
      const message = unreadCriticalAlerts.length === 1 
        ? `Alerta Crítica: ${unreadCriticalAlerts[0].mensaje}`
        : `Tienes ${unreadCriticalAlerts.length} alertas críticas pendientes.`;

      this.snackBar.open(message, 'Cerrar', {
        duration: 8000,
        panelClass: ['snackbar-error']
      });
    }
  }
}
