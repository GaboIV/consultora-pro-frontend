import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';

import { UsuarioDetalle, UsuarioProyectoAcceso, UsuarioProyectosAcceso } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'cp-usuario-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      @if (loading()) {
        <p class="state-msg">Cargando usuario…</p>
      } @else if (error()) {
        <p class="state-msg state-msg--error">{{ error() }}</p>
      } @else if (usuario(); as u) {
        <div class="usuario-header">
          <div class="header-row">
            <div class="header-left">
              <button class="back-circle" type="button" (click)="navigateBack()" title="Volver a usuarios">
                <i-lucide name="arrow-left" [size]="16" [strokeWidth]="2.5" />
              </button>
              <div class="avatar-token">{{ u.iniciales }}</div>
              <div>
                <div class="usuario-name-row">
                  <div class="usuario-name">{{ u.nombres }} {{ u.apellidos }}</div>
                  <div class="header-badges">
                    <cp-badge [label]="u.rol" tone="purple" />
                    <cp-badge [label]="u.activo ? 'Activo' : 'Inactivo'" [tone]="u.activo ? 'green' : 'gray'" />
                  </div>
                </div>
                <div class="usuario-sub">
                  <i-lucide name="user" [size]="13" [strokeWidth]="2" />
                  {{ u.puesto }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="body">
          <div class="grid-2">
            <div class="card info-card">
              <div class="card-title">Contacto</div>
              <div class="info-line">
                <i-lucide name="mail" [size]="14" [strokeWidth]="2" />
                <span>{{ u.correo }}</span>
              </div>
              <div class="info-line">
                <i-lucide name="phone" [size]="14" [strokeWidth]="2" />
                <span>{{ u.telefono || 'Sin teléfono' }}</span>
              </div>
            </div>
            <div class="card info-card">
              <div class="card-title">Cuenta</div>
              <div class="info-line">
                <i-lucide name="shield" [size]="14" [strokeWidth]="2" />
                <span>{{ u.rol }}</span>
              </div>
              <div class="info-line">
                <i-lucide name="clock" [size]="14" [strokeWidth]="2" />
                <span>Último acceso: {{ u.ultimoAcceso ? (u.ultimoAcceso | date: 'dd/MM/yyyy HH:mm') : 'Nunca' }}</span>
              </div>
            </div>
          </div>

          <div class="section-head">
            <span class="section-title">
              <i-lucide name="folder-kanban" [size]="13" [strokeWidth]="2.2" />
              Proyectos asignados
            </span>
          </div>

          @if (accesoTotal()) {
            <div class="info-banner">
              <i-lucide name="shield-check" [size]="16" [strokeWidth]="2" />
              Este usuario tiene acceso a todos los proyectos.
            </div>
          }

          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Clave</th>
                  <th>Cliente</th>
                </tr>
              </thead>
              <tbody>
                @for (proyecto of proyectosAsignados(); track proyecto.proyectoId) {
                  <tr (click)="navigateToProject(proyecto)">
                    <td class="n-cell">{{ proyecto.nombre }}</td>
                    <td>{{ proyecto.clave }}</td>
                    <td>{{ proyecto.cliente }}</td>
                  </tr>
                }
                @if (proyectosAsignados().length === 0) {
                  <tr>
                    <td colspan="3" class="empty-row">Sin proyectos asignados.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .state-msg { color: var(--text-muted, #94a3b8); font-size: 14px; }
    .state-msg--error { color: #ef4444; }

    .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .back-circle {
      width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border, #2a3343);
      background: transparent; color: inherit; display: grid; place-items: center; cursor: pointer;
    }
    .back-circle:hover { background: var(--surface-hover, rgba(255,255,255,0.04)); }
    .avatar-token {
      width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center;
      font-weight: 600; font-size: 16px; background: rgba(79,142,247,0.15); color: #4f8ef7;
    }
    .usuario-name-row { display: flex; align-items: center; gap: 10px; }
    .usuario-name { font-size: 20px; font-weight: 600; }
    .header-badges { display: flex; gap: 6px; }
    .usuario-sub { display: flex; align-items: center; gap: 6px; color: var(--text-muted, #94a3b8); font-size: 13px; margin-top: 4px; }

    .body { display: flex; flex-direction: column; gap: 18px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { border: 1px solid var(--border, #2a3343); border-radius: 12px; padding: 16px; background: var(--surface, #161c27); }
    .card-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #94a3b8); margin-bottom: 12px; }
    .info-line { display: flex; align-items: center; gap: 8px; font-size: 14px; padding: 4px 0; }

    .section-head { display: flex; justify-content: space-between; align-items: center; }
    .section-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .info-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(34,197,94,0.12); color: #22c55e; font-size: 13px; }

    .tbl-wrap { border: 1px solid var(--border, #2a3343); border-radius: 12px; overflow: hidden; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl thead th { text-align: left; padding: 10px 14px; font-size: 12px; color: var(--text-muted, #94a3b8); background: var(--surface, #161c27); }
    .tbl tbody tr { border-top: 1px solid var(--border, #2a3343); cursor: pointer; }
    .tbl tbody tr:hover { background: var(--surface-hover, rgba(255,255,255,0.03)); }
    .tbl td { padding: 12px 14px; }
    .n-cell { font-weight: 500; }
    .empty-row { color: var(--text-muted, #94a3b8); text-align: center; cursor: default; }
  `]
})
export class UsuarioDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly securityAdmin = inject(SecurityAdminService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly usuario = signal<UsuarioDetalle | null>(null);
  private readonly proyectos = signal<UsuarioProyectosAcceso | null>(null);

  protected readonly accesoTotal = computed(() => this.proyectos()?.accesoTotal ?? false);

  protected readonly proyectosAsignados = computed(() => {
    const data = this.proyectos();
    if (!data) return [];
    return data.accesoTotal ? data.proyectos : data.proyectos.filter((proyecto) => proyecto.asignado);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Usuario no encontrado.');
      this.loading.set(false);
      return;
    }

    this.securityAdmin.getUsuario(id).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 404 ? 'Usuario no encontrado.' : 'Error al cargar el usuario.');
        this.loading.set(false);
      }
    });

    this.securityAdmin.getUsuarioProyectos(id).subscribe({
      next: (proyectos) => this.proyectos.set(proyectos),
      error: () => this.proyectos.set(null)
    });
  }

  protected navigateBack(): void {
    this.router.navigate(['/equipo/usuarios']);
  }

  protected navigateToProject(proyecto: UsuarioProyectoAcceso): void {
    this.router.navigate(['/proyectos', proyecto.proyectoId]);
  }
}
