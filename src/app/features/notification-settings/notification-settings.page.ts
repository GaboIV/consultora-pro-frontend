import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';

import { NotificacionesService } from '../../core/services/notificaciones.service';
import { PreferenciaNotificacion } from '../../core/models/notificaciones.models';

interface GrupoPreferencias {
  nombre: string;
  preferencias: PreferenciaNotificacion[];
}

@Component({
  selector: 'cp-notification-settings',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './notification-settings.page.html',
  styleUrls: ['./notification-settings.page.scss']
})
export class NotificationSettingsPage implements OnInit {
  private readonly notificacionesService = inject(NotificacionesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly preferencias = signal<PreferenciaNotificacion[]>([]);

  readonly grupos = computed<GrupoPreferencias[]>(() => {
    const grupos = new Map<string, PreferenciaNotificacion[]>();
    for (const pref of this.preferencias()) {
      const lista = grupos.get(pref.grupo) ?? [];
      lista.push(pref);
      grupos.set(pref.grupo, lista);
    }
    return [...grupos.entries()].map(([nombre, preferencias]) => ({ nombre, preferencias }));
  });

  ngOnInit(): void {
    this.notificacionesService.getPreferencias().subscribe({
      next: (prefs) => {
        this.preferencias.set(prefs);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('No se pudieron cargar tus preferencias.', 'Cerrar', { duration: 5000 });
      }
    });
  }

  toggle(pref: PreferenciaNotificacion, canal: 'enApp' | 'porCorreo'): void {
    if (canal === 'porCorreo' && pref.correoObligatorio) {
      return;
    }
    this.preferencias.update((prefs) =>
      prefs.map((p) => (p.tipo === pref.tipo ? { ...p, [canal]: !p[canal] } : p))
    );
  }

  guardar(): void {
    this.guardando.set(true);
    const payload = this.preferencias().map((p) => ({
      tipo: p.tipo,
      enApp: p.enApp,
      porCorreo: p.porCorreo
    }));
    this.notificacionesService.updatePreferencias(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Preferencias guardadas.', 'Cerrar', { duration: 3500 });
      },
      error: () => {
        this.guardando.set(false);
        this.snackBar.open('No se pudieron guardar las preferencias.', 'Cerrar', { duration: 5000 });
      }
    });
  }
}
