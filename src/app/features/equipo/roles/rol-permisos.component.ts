import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { PermisoModulo, RolListItem } from '../../../core/models/security.models';
import { SecurityAdminService } from '../../../core/services/security-admin.service';

export interface RolPermisosData {
  rol: RolListItem;
}

interface PermisoItem {
  id: number;
  clave: string;
  nombre: string;
}

type GrupoKind = 'credenciales' | 'scoped' | 'plain';

interface GrupoVista {
  modulo: string;
  kind: GrupoKind;
  /** Prefijo del módulo con ámbito (p. ej. "clientes") para resolver `.ver` y `.ver.todos`. */
  prefijo: string;
  /** Permisos que se renderizan como checkbox (excluye los que tienen control dedicado). */
  checkboxes: PermisoItem[];
}

type CredLevel = 'none' | 'basico' | 'ver-todo' | 'full';
type Scope = 'none' | 'asignados' | 'todos';

const CRED_LEVEL_KEYS = ['credenciales.nivel.basico', 'credenciales.nivel.ver-todo', 'credenciales.nivel.full'];
const CRED_LEGACY_KEYS = ['credenciales.ver', 'credenciales.revelar', 'credenciales.crear', 'credenciales.editar', 'credenciales.solicitud.aprobar'];

@Component({
  selector: 'cp-rol-permisos',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <div class="modal-shell">
      <header class="cp-modal__header">
        <div>
          <h2 class="cp-modal__title">Permisos · {{ data.rol.nombre }}</h2>
          @if (data.rol.descripcion) {
            <p class="modal-sub">{{ data.rol.descripcion }}</p>
          }
        </div>
        <button class="cp-modal__close" type="button" (click)="dialogRef.close(false)" aria-label="Cerrar">×</button>
      </header>

      <div class="cp-modal__body">
        <div class="permission-stack">
          @for (grupo of vistas(); track grupo.modulo) {
            <section class="module-block">
              <h3>{{ grupo.modulo }}</h3>

              @switch (grupo.kind) {
                @case ('credenciales') {
                  <p class="control-hint">Nivel de acceso (excluyente): el nivel superior incluye al inferior.</p>
                  <div class="segmented">
                    @for (op of credLevelOptions; track op.value) {
                      <label class="seg-option" [class.active]="currentCredLevel() === op.value">
                        <input type="radio" name="cred-level"
                          [checked]="currentCredLevel() === op.value"
                          (change)="setCredLevel(op.value)" />
                        <span>{{ op.label }}</span>
                      </label>
                    }
                  </div>
                }

                @case ('scoped') {
                  <div class="control-row">
                    <span class="control-label">Ver</span>
                    <div class="segmented">
                      @for (op of scopeOptions; track op.value) {
                        <label class="seg-option" [class.active]="currentScope(grupo.prefijo) === op.value">
                          <input type="radio" [name]="'scope-' + grupo.prefijo"
                            [checked]="currentScope(grupo.prefijo) === op.value"
                            (change)="setScope(grupo.prefijo, op.value)" />
                          <span>{{ op.label }}</span>
                        </label>
                      }
                    </div>
                  </div>
                  @if (grupo.checkboxes.length > 0) {
                    <div class="permission-list">
                      @for (permiso of grupo.checkboxes; track permiso.id) {
                        <label class="permission-row">
                          <input type="checkbox" [checked]="selected().has(permiso.id)"
                            (change)="toggle(permiso.id, $any($event.target).checked)" />
                          <span><strong>{{ permiso.nombre }}</strong><small>{{ permiso.clave }}</small></span>
                        </label>
                      }
                    </div>
                  }
                }

                @default {
                  <div class="permission-list">
                    @for (permiso of grupo.checkboxes; track permiso.id) {
                      <label class="permission-row">
                        <input type="checkbox" [checked]="selected().has(permiso.id)"
                          (change)="toggle(permiso.id, $any($event.target).checked)" />
                        <span><strong>{{ permiso.nombre }}</strong><small>{{ permiso.clave }}</small></span>
                      </label>
                    }
                  </div>
                }
              }
            </section>
          }
        </div>
      </div>

      <footer class="cp-modal__footer">
        <button class="btn btn-secondary" type="button" (click)="dialogRef.close(false)">Cancelar</button>
        <button class="btn btn-primary" type="button" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Guardando...' : 'Guardar permisos' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .modal-shell {
      background: var(--bg-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      max-height: 86vh;
      min-width: min(760px, 94vw);
      overflow: hidden;
    }

    .modal-sub { color: var(--text-3); font-size: 12px; margin: 3px 0 0; }
    .permission-stack { display: grid; gap: 14px; }

    .module-block {
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
    }

    h3 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 13px;
      letter-spacing: 0;
      margin: 0 0 10px;
      text-transform: uppercase;
    }

    .control-hint { color: var(--text-3); font-size: 11px; margin: 0 0 8px; }
    .control-row { align-items: center; display: flex; gap: 12px; margin-bottom: 10px; }
    .control-label { color: var(--text-2); font-size: 13px; font-weight: 600; min-width: 36px; }

    .segmented { display: inline-flex; flex-wrap: wrap; gap: 6px; }
    .seg-option {
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      font-size: 12px;
      gap: 6px;
      padding: 6px 12px;
    }
    .seg-option.active { background: var(--accent, #2563eb); border-color: var(--accent, #2563eb); color: #fff; }
    .seg-option input { accent-color: #fff; margin: 0; }

    .permission-list {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .permission-row {
      align-items: flex-start;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: flex;
      gap: 9px;
      padding: 10px;
    }

    .permission-row strong, .permission-row small { display: block; line-height: 1.3; }
    .permission-row strong { color: var(--text); font-size: 13px; }
    .permission-row small { color: var(--text-3); font-family: var(--font-mono); font-size: 11px; margin-top: 2px; }

    @media (max-width: 700px) {
      .permission-list { grid-template-columns: 1fr; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolPermisosComponent {
  protected readonly data = inject<RolPermisosData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<RolPermisosComponent>);
  private readonly service = inject(SecurityAdminService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly vistas = signal<GrupoVista[]>([]);
  protected readonly selected = signal(new Set<number>());
  protected readonly saving = signal(false);

  protected readonly credLevelOptions: { value: CredLevel; label: string }[] = [
    { value: 'none', label: 'Sin acceso' },
    { value: 'basico', label: 'Datos básicos' },
    { value: 'ver-todo', label: 'Ver todo' },
    { value: 'full', label: 'Acceso total' }
  ];
  protected readonly scopeOptions: { value: Scope; label: string }[] = [
    { value: 'none', label: 'Sin acceso' },
    { value: 'asignados', label: 'Asignados' },
    { value: 'todos', label: 'Todos' }
  ];

  private readonly byClave = new Map<string, number>();

  constructor() {
    forkJoin({
      catalogo: this.service.getPermisos(),
      rol: this.service.getRol(this.data.rol.id)
    }).subscribe({
      next: ({ catalogo, rol }) => {
        this.indexCatalogo(catalogo);
        this.vistas.set(catalogo.map((grupo) => this.toVista(grupo)));
        this.selected.set(new Set(rol.permisosIds));
      },
      error: () => this.snackBar.open('No se pudieron cargar los permisos.', 'Cerrar', { duration: 3500 })
    });
  }

  private indexCatalogo(catalogo: PermisoModulo[]): void {
    this.byClave.clear();
    for (const grupo of catalogo)
      for (const permiso of grupo.permisos)
        this.byClave.set(permiso.clave, permiso.id);
  }

  private toVista(grupo: PermisoModulo): GrupoVista {
    const claves = grupo.permisos.map((p) => p.clave);

    // Módulo de credenciales: se controla únicamente con el radio de niveles.
    if (claves.some((c) => /\.nivel\.(full|ver-todo|basico)$/.test(c))) {
      return { modulo: grupo.modulo, kind: 'credenciales', prefijo: '', checkboxes: [] };
    }

    // Módulo con ámbito: tiene un "<prefijo>.ver.todos".
    const scopeKey = claves.find((c) => c.endsWith('.ver.todos'));
    if (scopeKey) {
      const prefijo = scopeKey.slice(0, -'.ver.todos'.length);
      const checkboxes = grupo.permisos
        .filter((p) => p.clave !== `${prefijo}.ver` && p.clave !== `${prefijo}.ver.todos`)
        .map(this.toItem);
      return { modulo: grupo.modulo, kind: 'scoped', prefijo, checkboxes };
    }

    return { modulo: grupo.modulo, kind: 'plain', prefijo: '', checkboxes: grupo.permisos.map(this.toItem) };
  }

  private toItem = (p: { id: number; clave: string; nombre: string }): PermisoItem => ({
    id: p.id, clave: p.clave, nombre: p.nombre
  });

  // ─── Credenciales (niveles excluyentes) ────────────────────────────────────

  protected currentCredLevel(): CredLevel {
    if (this.hasClave('credenciales.nivel.full')) return 'full';
    if (this.hasClave('credenciales.nivel.ver-todo')) return 'ver-todo';
    if (this.hasClave('credenciales.nivel.basico')) return 'basico';
    // Datos legacy: se mapean al nivel equivalente para mostrarlos correctamente.
    if (this.hasClave('credenciales.revelar')) return 'ver-todo';
    if (this.hasClave('credenciales.ver')) return 'basico';
    return 'none';
  }

  protected setCredLevel(level: CredLevel): void {
    const sel = new Set(this.selected());
    // El nivel es la única fuente para Credenciales: se limpian niveles y claves legacy implícitas.
    for (const clave of [...CRED_LEVEL_KEYS, ...CRED_LEGACY_KEYS]) this.removeClave(sel, clave);

    const chosen = level === 'basico' ? 'credenciales.nivel.basico'
      : level === 'ver-todo' ? 'credenciales.nivel.ver-todo'
      : level === 'full' ? 'credenciales.nivel.full' : null;
    if (chosen) this.addClave(sel, chosen);

    this.selected.set(sel);
  }

  // ─── Ámbito por módulo (ver: sin acceso / asignados / todos) ────────────────

  protected currentScope(prefijo: string): Scope {
    if (this.hasClave(`${prefijo}.ver.todos`)) return 'todos';
    if (this.hasClave(`${prefijo}.ver`)) return 'asignados';
    return 'none';
  }

  protected setScope(prefijo: string, scope: Scope): void {
    const sel = new Set(this.selected());
    this.removeClave(sel, `${prefijo}.ver`);
    this.removeClave(sel, `${prefijo}.ver.todos`);

    if (scope === 'asignados') {
      this.addClave(sel, `${prefijo}.ver`);
    } else if (scope === 'todos') {
      this.addClave(sel, `${prefijo}.ver`);
      this.addClave(sel, `${prefijo}.ver.todos`);
    }

    this.selected.set(sel);
  }

  // ─── Checkboxes simples ─────────────────────────────────────────────────────

  protected toggle(id: number, checked: boolean): void {
    const sel = new Set(this.selected());
    if (checked) sel.add(id); else sel.delete(id);
    this.selected.set(sel);
  }

  protected save(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.service.updateRolPermisos(this.data.rol.id, { permisosIds: [...this.selected()] }).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.saving.set(false);
        const message = error instanceof HttpErrorResponse ? error.error?.message : null;
        this.snackBar.open(message ?? 'No se pudieron guardar los permisos.', 'Cerrar', { duration: 4200 });
      }
    });
  }

  private hasClave(clave: string): boolean {
    const id = this.byClave.get(clave);
    return id != null && this.selected().has(id);
  }

  private addClave(set: Set<number>, clave: string): void {
    const id = this.byClave.get(clave);
    if (id != null) set.add(id);
  }

  private removeClave(set: Set<number>, clave: string): void {
    const id = this.byClave.get(clave);
    if (id != null) set.delete(id);
  }
}
