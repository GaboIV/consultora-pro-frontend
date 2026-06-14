import { ChangeDetectionStrategy, Component, OnChanges, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TablerosService } from '../../core/services/tableros.service';
import { Tablero } from '../../core/models/kanban.models';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { apiErrorMessage } from '../../core/utils/api-error-message';

@Component({
  selector: 'cp-tablero-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-actions">
      <h2 class="tab-title">Tableros Kanban</h2>
      <button class="kb-btn kb-btn-primary" type="button" (click)="toggleForm()" *appHasPermission="'kanban.crear'">
        <i-lucide name="plus" [size]="16" />
        Nuevo tablero
      </button>
    </div>

    @if (showForm()) {
      <form class="kb-create" (ngSubmit)="create()">
        <input class="kb-input" [(ngModel)]="nombre" name="nombre" placeholder="Nombre del tablero (p. ej. Tareas)" maxlength="200" required />
        <input class="kb-input kb-input-clave" [(ngModel)]="clave" name="clave" placeholder="Clave (auto)" maxlength="6" />
        <button class="kb-btn kb-btn-primary" type="submit" [disabled]="saving() || !nombre.trim()">Crear</button>
        <button class="kb-btn kb-btn-ghost" type="button" (click)="toggleForm()">Cancelar</button>
      </form>
    }

    @if (loading()) {
      <p class="kb-muted">Cargando tableros…</p>
    } @else if (tableros().length === 0) {
      <div class="kb-empty">
        <i-lucide name="folder-kanban" [size]="32" [strokeWidth]="1.5" />
        <p>Este proyecto aún no tiene tableros.</p>
      </div>
    } @else {
      <div class="kb-grid">
        @for (t of tableros(); track t.id) {
          <a class="kb-card" [routerLink]="['/proyectos', proyectoId(), 'tableros', t.id]">
            <div class="kb-card-top">
              <span class="kb-clave kb-tone-{{ t.colorClass }}">{{ t.clave }}</span>
              <span class="kb-card-name">{{ t.nombre }}</span>
            </div>
            @if (t.descripcion) {
              <p class="kb-card-desc">{{ t.descripcion }}</p>
            }
            <div class="kb-card-meta">
              <span><i-lucide name="folder-tree" [size]="14" /> {{ t.totalColumnas }} columnas</span>
              <span><i-lucide name="layout-dashboard" [size]="14" /> {{ t.totalTarjetas }} tarjetas</span>
              <span><i-lucide name="users" [size]="14" /> {{ t.totalMiembros }}</span>
            </div>
          </a>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .tab-actions { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .tab-title { font-family: var(--font-head); font-size: 1.05rem; margin: 0; }
    .kb-create { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .kb-input { background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 8px 12px; font-family: var(--font-body); flex: 1; min-width: 200px; }
    .kb-input-clave { flex: 0 0 120px; min-width: 100px; text-transform: uppercase; }
    .kb-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: var(--radius); padding: 8px 14px; font-family: var(--font-body); font-size: 0.85rem; cursor: pointer; border: 1px solid var(--border); background: var(--bg-3); color: var(--text); }
    .kb-btn:hover { border-color: var(--border-strong); }
    .kb-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .kb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .kb-btn-ghost { background: transparent; }
    .kb-muted { color: var(--text-2); }
    .kb-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px; color: var(--text-3); border: 1px dashed var(--border); border-radius: var(--radius-lg); }
    .kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
    .kb-card { display: block; background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; text-decoration: none; color: var(--text); transition: border-color 0.15s, transform 0.15s; }
    .kb-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .kb-card-top { display: flex; align-items: center; gap: 8px; }
    .kb-clave { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: rgba(79,142,247,0.15); color: var(--accent); }
    .kb-tone-green { background: rgba(62,207,142,0.15); color: var(--green); }
    .kb-tone-amber { background: rgba(245,166,35,0.15); color: var(--amber); }
    .kb-tone-purple { background: rgba(159,122,250,0.15); color: var(--purple); }
    .kb-tone-red { background: rgba(229,83,83,0.15); color: var(--red); }
    .kb-tone-teal { background: rgba(45,212,191,0.15); color: var(--teal); }
    .kb-card-name { font-family: var(--font-head); font-weight: 600; }
    .kb-card-desc { color: var(--text-2); font-size: 0.85rem; margin: 10px 0 0; }
    .kb-card-meta { display: flex; gap: 14px; margin-top: 14px; color: var(--text-3); font-size: 0.78rem; }
    .kb-card-meta span { display: inline-flex; align-items: center; gap: 4px; }
  `]
})
export class TableroListComponent implements OnChanges {
  private readonly service = inject(TablerosService);
  private readonly snackBar = inject(MatSnackBar);

  readonly proyectoId = input.required<string>();

  protected readonly tableros = signal<Tablero[]>([]);
  protected readonly loading = signal(true);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected nombre = '';
  protected clave = '';

  ngOnChanges(): void {
    this.load();
  }

  private load(): void {
    const id = this.proyectoId();
    if (!id) return;
    this.loading.set(true);
    this.service.getByProyecto(id).subscribe({
      next: (data) => {
        this.tableros.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  protected toggleForm(): void {
    this.showForm.update((v) => !v);
  }

  protected create(): void {
    const nombre = this.nombre.trim();
    if (!nombre) return;
    this.saving.set(true);
    this.service.create({
      proyectoId: this.proyectoId(),
      nombre,
      clave: this.clave.trim() || undefined,
      crearColumnasPorDefecto: true
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.nombre = '';
        this.clave = '';
        this.snackBar.open('Tablero creado.', 'Cerrar', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(apiErrorMessage(err, 'No se pudo crear el tablero.'), 'Cerrar', { duration: 4200 });
      }
    });
  }
}
