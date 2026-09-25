import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { switchMap } from 'rxjs';

import { OrganigramaResumen, OrganigramasService } from '../../../core/services/organigramas.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { CloseOnBackDirective } from '../../../shared/directives/close-on-back.directive';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'cp-organigramas-list-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, HasPermissionDirective, CloseOnBackDirective],
  template: `
    <section class="page">
      <header class="page-header page-header-row">
        <div>
          <h1 class="page-title">Organigramas</h1>
          <p class="page-subtitle">Esquemas del equipo con cargos escritos a mano, independientes de los roles de acceso</p>
        </div>
        <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'organigramas.editar'">
          <i-lucide name="plus" [size]="15" [strokeWidth]="2" />
          Nuevo organigrama
        </button>
      </header>

      @if (loading() && organigramas().length === 0) {
        <p class="empty-hint">Cargando organigramas...</p>
      } @else if (organigramas().length === 0) {
        <div class="empty-panel">
          <i-lucide name="network" [size]="34" [strokeWidth]="1.6" />
          <h2>Aún no hay organigramas</h2>
          <p>Crea un esquema y define los cargos con tus propias palabras: "Jefe de Delivery", "Coordinadora QA", etc.</p>
          <button class="btn btn-primary" type="button" (click)="openCreate()" *appHasPermission="'organigramas.editar'">
            <i-lucide name="plus" [size]="15" [strokeWidth]="2" />
            Crear el primero
          </button>
        </div>
      } @else {
        <div class="org-grid">
          @for (org of organigramas(); track org.id) {
            <article class="org-card">
              <a class="org-card__main" [routerLink]="['/equipo/organigramas', org.id]">
                <span class="org-card__icon"><i-lucide name="network" [size]="20" [strokeWidth]="1.9" /></span>
                <div class="org-card__text">
                  <h2>{{ org.nombre }}</h2>
                  <p>{{ org.descripcion || 'Sin descripción' }}</p>
                </div>
              </a>
              <footer class="org-card__footer">
                <div class="org-card__stats">
                  <span class="stat-chip">{{ org.totalNodos }} {{ org.totalNodos === 1 ? 'posición' : 'posiciones' }}</span>
                  @if (org.totalNodos > org.totalAsignados) {
                    <span class="stat-chip is-warn">{{ org.totalNodos - org.totalAsignados }} vacante(s)</span>
                  }
                  <span class="updated">Actualizado {{ formatFecha(org.fechaActualizacion) }}</span>
                </div>
                <div class="org-card__actions">
                  <button class="icon-button sm" type="button" title="Duplicar" [disabled]="busyId() === org.id"
                          (click)="duplicar(org)" *appHasPermission="'organigramas.editar'">
                    <i-lucide name="copy" [size]="14" [strokeWidth]="2" />
                  </button>
                  <button class="icon-button sm danger" type="button" title="Eliminar" [disabled]="busyId() === org.id"
                          (click)="eliminar(org)" *appHasPermission="'organigramas.eliminar'">
                    <i-lucide name="trash-2" [size]="14" [strokeWidth]="2" />
                  </button>
                </div>
              </footer>
            </article>
          }
        </div>
      }
    </section>

    @if (showForm()) {
      <div class="cp-modal-overlay" cpCloseOnBack (cpCloseOnBack)="closeForm()" (click)="closeForm()">
        <div class="cp-modal cp-modal--sm" (click)="$event.stopPropagation()">
          <header class="cp-modal__header">
            <h2 class="cp-modal__title">Nuevo organigrama</h2>
            <button class="cp-modal__close" type="button" (click)="closeForm()" aria-label="Cerrar">×</button>
          </header>

          <div class="cp-modal__body">
            <div class="form-field">
              <label class="form-label" for="org-nombre">Nombre</label>
              <input id="org-nombre" class="form-input" [(ngModel)]="nombre" name="nombre" maxlength="120"
                     placeholder="Ej: Estructura Delivery 2026" (keyup.enter)="create()" />
            </div>
            <div class="form-field">
              <label class="form-label" for="org-desc">Descripción (opcional)</label>
              <textarea id="org-desc" class="form-input" [(ngModel)]="descripcion" name="descripcion" maxlength="500"
                        placeholder="Para qué sirve este esquema"></textarea>
            </div>
          </div>

          <footer class="cp-modal__footer">
            <button class="btn btn-secondary" type="button" (click)="closeForm()">Cancelar</button>
            <button class="btn btn-primary" type="button" (click)="create()" [disabled]="!nombre.trim() || saving()">
              Crear y editar
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header-row {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .empty-hint {
      color: var(--text-2);
      padding: 24px 0;
      text-align: center;
    }

    .empty-panel {
      align-items: center;
      background: var(--bg-2);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-lg);
      color: var(--text-2);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-panel i-lucide { color: var(--accent); }

    .empty-panel h2 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 17px;
      margin: 6px 0 0;
    }

    .empty-panel p {
      margin: 0 0 10px;
      max-width: 460px;
    }

    .org-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }

    .org-card {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      transition: border-color 0.18s ease, transform 0.18s ease;
    }

    .org-card:hover {
      border-color: rgba(79, 142, 247, 0.45);
      transform: translateY(-1px);
    }

    .org-card__main {
      color: var(--text);
      display: flex;
      flex: 1;
      gap: 14px;
      padding: 18px 18px 12px;
      text-decoration: none;
    }

    .org-card__icon {
      align-items: center;
      background: rgba(79, 142, 247, 0.14);
      border-radius: 10px;
      color: var(--accent);
      display: inline-flex;
      flex: 0 0 auto;
      height: 40px;
      justify-content: center;
      width: 40px;
    }

    .org-card__text { min-width: 0; }

    .org-card__text h2 {
      font-family: var(--font-head);
      font-size: 15px;
      margin: 0 0 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .org-card__text p {
      color: var(--text-2);
      display: -webkit-box;
      font-size: 13px;
      margin: 0;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .org-card__footer {
      align-items: center;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      justify-content: space-between;
      padding: 10px 14px 10px 18px;
    }

    .org-card__stats {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;
    }

    .stat-chip {
      background: rgba(79, 142, 247, 0.14);
      border-radius: 999px;
      color: var(--accent);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      white-space: nowrap;
    }

    .stat-chip.is-warn {
      background: rgba(245, 166, 35, 0.14);
      color: var(--amber);
    }

    .updated {
      color: var(--text-3);
      font-size: 11px;
    }

    .org-card__actions {
      display: flex;
      flex: 0 0 auto;
      gap: 6px;
    }

    .icon-button.sm {
      height: 32px;
      width: 34px;
    }

    .icon-button.danger:hover {
      border-color: rgba(229, 83, 83, 0.42);
      color: var(--red);
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .form-label {
      color: var(--text-2);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    @media (max-width: 760px) {
      .page-header-row {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrganigramasListPage {
  private readonly service = inject(OrganigramasService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly organigramas = signal<OrganigramaResumen[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly busyId = signal<string | null>(null);

  protected nombre = '';
  protected descripcion = '';

  constructor() {
    this.load();
  }

  protected openCreate(): void {
    this.nombre = '';
    this.descripcion = '';
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
  }

  protected create(): void {
    const nombre = this.nombre.trim();
    if (!nombre || this.saving()) return;

    this.saving.set(true);
    this.service.create({ nombre, descripcion: this.descripcion.trim(), nodos: [] }).subscribe({
      next: (org) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.router.navigate(['/equipo/organigramas', org.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.snackBar.open(apiErrorMessage(error, 'No se pudo crear el organigrama.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected duplicar(org: OrganigramaResumen): void {
    if (this.busyId()) return;

    this.busyId.set(org.id);
    this.service
      .getById(org.id)
      .pipe(
        switchMap((detalle) => {
          // Ids nuevos para cada nodo, conservando la jerarquía original.
          const ids = new Map(detalle.nodos.map((n) => [n.id, crypto.randomUUID()]));
          return this.service.create({
            nombre: this.nombreCopia(detalle.nombre),
            descripcion: detalle.descripcion,
            nodos: detalle.nodos.map(({ usuario: _usuario, ...n }) => ({
              ...n,
              id: ids.get(n.id)!,
              parentId: n.parentId ? ids.get(n.parentId) ?? null : null
            }))
          });
        })
      )
      .subscribe({
        next: (copia) => {
          this.busyId.set(null);
          this.snackBar.open(`Se creó "${copia.nombre}".`, 'Cerrar', { duration: 2800 });
          this.load();
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.snackBar.open(apiErrorMessage(error, 'No se pudo duplicar el organigrama.'), 'Cerrar', { duration: 4200 });
        }
      });
  }

  protected eliminar(org: OrganigramaResumen): void {
    if (this.busyId()) return;
    if (!confirm(`¿Eliminar el organigrama "${org.nombre}" y sus ${org.totalNodos} posiciones? Esta acción no se puede deshacer.`)) return;

    this.busyId.set(org.id);
    this.service.delete(org.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.snackBar.open('Organigrama eliminado.', 'Cerrar', { duration: 2800 });
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.snackBar.open(apiErrorMessage(error, 'No se pudo eliminar el organigrama.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  protected formatFecha(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private nombreCopia(nombre: string): string {
    const existentes = new Set(this.organigramas().map((o) => o.nombre.toLowerCase()));
    let candidato = `${nombre} (copia)`;
    for (let i = 2; existentes.has(candidato.toLowerCase()); i++) {
      candidato = `${nombre} (copia ${i})`;
    }
    return candidato.slice(0, 120);
  }

  private load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (list) => {
        this.organigramas.set(list);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.snackBar.open(apiErrorMessage(error, 'No se pudieron cargar los organigramas.'), 'Cerrar', { duration: 4200 });
      }
    });
  }
}
