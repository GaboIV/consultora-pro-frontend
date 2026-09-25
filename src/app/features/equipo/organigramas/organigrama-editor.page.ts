import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../../core/services/auth.service';
import {
  Organigrama,
  OrganigramaNodo,
  OrganigramaNodoPayload,
  OrganigramaPayload,
  OrganigramaUsuario,
  OrganigramasService
} from '../../../core/services/organigramas.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

type NodoEdit = OrganigramaNodoPayload;
type ModoPersona = 'usuario' | 'libre' | 'vacante';

interface ColorOpcion {
  valor: string;
  etiqueta: string;
  css: string;
}

const COLORES: ColorOpcion[] = [
  { valor: '', etiqueta: 'Azul (por defecto)', css: 'var(--accent)' },
  { valor: 'green', etiqueta: 'Verde', css: 'var(--green)' },
  { valor: 'amber', etiqueta: 'Ámbar', css: 'var(--amber)' },
  { valor: 'purple', etiqueta: 'Violeta', css: 'var(--purple)' },
  { valor: 'teal', etiqueta: 'Turquesa', css: 'var(--teal)' },
  { valor: 'red', etiqueta: 'Rojo', css: 'var(--red)' }
];

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.6;

function toEdit(n: OrganigramaNodo): NodoEdit {
  return {
    id: n.id,
    parentId: n.parentId,
    cargo: n.cargo,
    area: n.area,
    nombreLibre: n.nombreLibre,
    usuarioId: n.usuarioId,
    notas: n.notas,
    color: n.color,
    orden: n.orden
  };
}

/** Reasigna `orden` 0..n dentro de cada nivel respetando el orden relativo actual. */
function normalizar(list: NodoEdit[]): NodoEdit[] {
  const grupos = new Map<string | null, NodoEdit[]>();
  for (const n of list) {
    const grupo = grupos.get(n.parentId) ?? [];
    grupo.push(n);
    grupos.set(n.parentId, grupo);
  }

  const orden = new Map<string, number>();
  for (const grupo of grupos.values()) {
    [...grupo].sort((a, b) => a.orden - b.orden).forEach((n, i) => orden.set(n.id, i));
  }

  return list.map((n) => (n.orden === orden.get(n.id) ? n : { ...n, orden: orden.get(n.id)! }));
}

@Component({
  selector: 'cp-organigrama-editor-page',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, NgSelectModule, RouterLink, LucideAngularModule],
  template: `
    <section class="page editor-page">
      <header class="editor-header">
        <a class="back-link" routerLink="/equipo/organigramas">
          <i-lucide name="arrow-left" [size]="15" [strokeWidth]="2" />
          Organigramas
        </a>
        <div class="editor-header__row">
          <div class="editor-title">
            <h1 class="page-title">{{ nombre() || 'Organigrama' }}</h1>
            @if (dirty()) {
              <span class="dirty-chip">Cambios sin guardar</span>
            }
          </div>
          @if (canEdit && organigrama()) {
            <div class="editor-actions">
              <button class="btn btn-secondary" type="button" (click)="descartar()" [disabled]="!dirty() || saving()">
                <i-lucide name="rotate-ccw" [size]="14" [strokeWidth]="2" />
                Descartar
              </button>
              <button class="btn btn-primary" type="button" (click)="guardar()"
                      [disabled]="!dirty() || saving() || !!errorValidacion()"
                      [title]="errorValidacion() ?? 'Guardar (Ctrl+S)'">
                <i-lucide name="save" [size]="14" [strokeWidth]="2" />
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          }
        </div>
        @if (descripcion()) {
          <p class="page-subtitle">{{ descripcion() }}</p>
        }
      </header>

      @if (loading()) {
        <p class="state-hint">Cargando organigrama...</p>
      } @else if (!organigrama()) {
        <p class="state-hint">No se encontró el organigrama. <a routerLink="/equipo/organigramas">Volver al listado</a></p>
      } @else {
        <div class="workspace">
          <div class="canvas-wrap">
            <div class="toolbar">
              <div class="search">
                <i-lucide name="search" [size]="14" [strokeWidth]="2" />
                <input type="search" placeholder="Buscar cargo, área o persona" [ngModel]="busqueda()"
                       (ngModelChange)="busqueda.set($event)" aria-label="Buscar en el organigrama" />
              </div>
              <div class="toolbar__group">
                @if (canEdit) {
                  <button class="btn btn-secondary btn-sm" type="button" (click)="agregar(null)">
                    <i-lucide name="plus" [size]="14" [strokeWidth]="2" />
                    Posición raíz
                  </button>
                }
                <button class="icon-button sm" type="button" title="Expandir todo" (click)="expandirTodo()">
                  <i-lucide name="chevrons-up-down" [size]="15" [strokeWidth]="2" />
                </button>
                <button class="icon-button sm" type="button" title="Contraer todo" (click)="contraerTodo()">
                  <i-lucide name="chevrons-down-up" [size]="15" [strokeWidth]="2" />
                </button>
                <span class="divider"></span>
                <button class="icon-button sm" type="button" title="Alejar" (click)="cambiarZoom(-0.1)" [disabled]="zoom() <= zoomMin">
                  <i-lucide name="zoom-out" [size]="15" [strokeWidth]="2" />
                </button>
                <button class="zoom-label" type="button" title="Restablecer zoom" (click)="zoom.set(1)">{{ zoomPct() }}%</button>
                <button class="icon-button sm" type="button" title="Acercar" (click)="cambiarZoom(0.1)" [disabled]="zoom() >= zoomMax">
                  <i-lucide name="zoom-in" [size]="15" [strokeWidth]="2" />
                </button>
              </div>
            </div>

            <div class="canvas" (click)="seleccionar(null)">
              @if (nodos().length === 0) {
                <div class="canvas-empty">
                  <i-lucide name="network" [size]="32" [strokeWidth]="1.6" />
                  <p>Este organigrama aún no tiene posiciones.</p>
                  @if (canEdit) {
                    <button class="btn btn-primary" type="button" (click)="agregar(null); $event.stopPropagation()">
                      <i-lucide name="plus" [size]="15" [strokeWidth]="2" />
                      Agregar la primera posición
                    </button>
                  }
                </div>
              } @else {
                <div class="tree" [style.zoom]="zoom()">
                  <ng-container *ngTemplateOutlet="rama; context: { $implicit: null }" />
                </div>
              }
            </div>
          </div>

          <aside class="side">
            @if (seleccionado(); as n) {
              <header class="side__header">
                <h2>Posición</h2>
                <button class="icon-button sm" type="button" title="Cerrar" (click)="seleccionar(null)">
                  <i-lucide name="x" [size]="15" [strokeWidth]="2" />
                </button>
              </header>

              @if (canEdit) {
                <div class="form-field">
                  <label class="form-label" for="nodo-cargo">Cargo</label>
                  <input id="nodo-cargo" class="form-input" list="org-cargos" maxlength="120"
                         [ngModel]="n.cargo" (ngModelChange)="patch(n.id, { cargo: $event })"
                         placeholder="Ej: Jefa de Delivery" />
                </div>

                <div class="form-field">
                  <label class="form-label" for="nodo-area">Área (opcional)</label>
                  <input id="nodo-area" class="form-input" list="org-areas" maxlength="120"
                         [ngModel]="n.area" (ngModelChange)="patch(n.id, { area: $event })"
                         placeholder="Ej: Operaciones" />
                </div>

                <div class="form-field">
                  <span class="form-label">Persona</span>
                  <div class="segmented" role="group" aria-label="Tipo de persona">
                    <button type="button" [class.is-active]="modoPersona() === 'usuario'" (click)="cambiarModo(n.id, 'usuario')">Usuario</button>
                    <button type="button" [class.is-active]="modoPersona() === 'libre'" (click)="cambiarModo(n.id, 'libre')">Nombre libre</button>
                    <button type="button" [class.is-active]="modoPersona() === 'vacante'" (click)="cambiarModo(n.id, 'vacante')">Vacante</button>
                  </div>
                  @switch (modoPersona()) {
                    @case ('usuario') {
                      <ng-select
                        [items]="usuarios()"
                        bindLabel="nombreCompleto"
                        bindValue="id"
                        [ngModel]="n.usuarioId"
                        (ngModelChange)="patch(n.id, { usuarioId: $event ?? null })"
                        placeholder="Selecciona un usuario del portal"
                        appendTo="body"
                        [searchFn]="buscarUsuario"
                      >
                        <ng-template ng-option-tmp let-item="item">
                          <div class="user-option">
                            <span>{{ item.nombreCompleto }}</span>
                            <small>{{ item.puesto || item.correo }}{{ item.activo ? '' : ' · inactivo' }}</small>
                          </div>
                        </ng-template>
                      </ng-select>
                    }
                    @case ('libre') {
                      <input class="form-input" maxlength="150" [ngModel]="n.nombreLibre"
                             (ngModelChange)="patch(n.id, { nombreLibre: $event })"
                             placeholder="Nombre de la persona (externa, por contratar...)" />
                    }
                  }
                </div>

                <div class="form-field">
                  <span class="form-label">Depende de</span>
                  <ng-select
                    [items]="padresPosibles()"
                    bindLabel="etiqueta"
                    bindValue="id"
                    [ngModel]="n.parentId"
                    (ngModelChange)="moverA(n.id, $event ?? null)"
                    placeholder="Nivel superior (sin jefe)"
                    appendTo="body"
                  />
                </div>

                <div class="form-field">
                  <span class="form-label">Posición entre sus pares</span>
                  <div class="row-buttons">
                    <button class="btn btn-secondary btn-sm" type="button" (click)="desplazar(n.id, -1)" [disabled]="!puedeDesplazar(n, -1)">
                      <i-lucide name="chevron-left" [size]="14" [strokeWidth]="2" />
                      Izquierda
                    </button>
                    <button class="btn btn-secondary btn-sm" type="button" (click)="desplazar(n.id, 1)" [disabled]="!puedeDesplazar(n, 1)">
                      Derecha
                      <i-lucide name="chevron-right" [size]="14" [strokeWidth]="2" />
                    </button>
                  </div>
                </div>

                <div class="form-field">
                  <span class="form-label">Color</span>
                  <div class="swatches">
                    @for (c of colores; track c.valor) {
                      <button type="button" class="swatch" [style.--swatch]="c.css" [class.is-active]="n.color === c.valor"
                              [title]="c.etiqueta" [attr.aria-label]="c.etiqueta" (click)="patch(n.id, { color: c.valor })"></button>
                    }
                  </div>
                </div>

                <div class="form-field">
                  <label class="form-label" for="nodo-notas">Notas (opcional)</label>
                  <textarea id="nodo-notas" class="form-input" maxlength="500" [ngModel]="n.notas"
                            (ngModelChange)="patch(n.id, { notas: $event })"
                            placeholder="Responsabilidades, reemplazos, observaciones..."></textarea>
                </div>

                <div class="side__actions">
                  <button class="btn btn-secondary btn-sm" type="button" (click)="agregar(n.id)">
                    <i-lucide name="corner-down-right" [size]="14" [strokeWidth]="2" />
                    Agregar subordinado
                  </button>
                  <button class="btn btn-secondary btn-sm" type="button" (click)="agregar(n.parentId, n.orden + 0.5)">
                    <i-lucide name="plus" [size]="14" [strokeWidth]="2" />
                    Agregar al mismo nivel
                  </button>
                  <button class="btn btn-danger btn-sm" type="button" (click)="eliminar(n, false)">
                    <i-lucide name="trash-2" [size]="14" [strokeWidth]="2" />
                    {{ hijosDe(n.id).length > 0 ? 'Eliminar solo esta posición' : 'Eliminar posición' }}
                  </button>
                  @if (hijosDe(n.id).length > 0) {
                    <button class="btn btn-danger btn-sm" type="button" (click)="eliminar(n, true)">
                      <i-lucide name="trash-2" [size]="14" [strokeWidth]="2" />
                      Eliminar con subordinados ({{ contarDescendientes(n.id) }})
                    </button>
                  }
                </div>
              } @else {
                <dl class="details">
                  <dt>Cargo</dt>
                  <dd>{{ n.cargo }}</dd>
                  @if (n.area) {
                    <dt>Área</dt>
                    <dd>{{ n.area }}</dd>
                  }
                  <dt>Persona</dt>
                  <dd>
                    {{ persona(n) ?? 'Vacante' }}
                    @if (n.usuarioId && usuariosById().get(n.usuarioId); as u) {
                      <small>{{ u.correo }}{{ u.puesto ? ' · ' + u.puesto : '' }}</small>
                    }
                  </dd>
                  <dt>Depende de</dt>
                  <dd>{{ n.parentId ? (nodosById().get(n.parentId)?.cargo ?? '—') : 'Nivel superior' }}</dd>
                  <dt>Subordinados directos</dt>
                  <dd>{{ hijosDe(n.id).length }}</dd>
                  @if (n.notas) {
                    <dt>Notas</dt>
                    <dd class="pre">{{ n.notas }}</dd>
                  }
                </dl>
              }
            } @else {
              <header class="side__header">
                <h2>Datos del organigrama</h2>
              </header>
              @if (canEdit) {
                <div class="form-field">
                  <label class="form-label" for="org-nombre">Nombre</label>
                  <input id="org-nombre" class="form-input" maxlength="120" [ngModel]="nombre()" (ngModelChange)="nombre.set($event)" />
                </div>
                <div class="form-field">
                  <label class="form-label" for="org-descripcion">Descripción</label>
                  <textarea id="org-descripcion" class="form-input" maxlength="500" [ngModel]="descripcion()"
                            (ngModelChange)="descripcion.set($event)"></textarea>
                </div>
              }
              <div class="stats">
                <div><strong>{{ nodos().length }}</strong><span>Posiciones</span></div>
                <div><strong>{{ totalAsignados() }}</strong><span>Asignadas</span></div>
                <div><strong>{{ nodos().length - totalAsignados() }}</strong><span>Vacantes</span></div>
                <div><strong>{{ areasSugeridas().length }}</strong><span>Áreas</span></div>
              </div>
              <p class="side__hint">
                {{ canEdit
                  ? 'Haz clic en una posición para editarla. Los cargos son texto libre: no dependen de los roles de acceso.'
                  : 'Haz clic en una posición para ver su detalle.' }}
              </p>
            }
            @if (errorValidacion(); as err) {
              <p class="side__error">{{ err }}</p>
            }
          </aside>
        </div>

        <datalist id="org-cargos">
          @for (c of cargosSugeridos(); track c) { <option [value]="c"></option> }
        </datalist>
        <datalist id="org-areas">
          @for (a of areasSugeridas(); track a) { <option [value]="a"></option> }
        </datalist>
      }
    </section>

    <ng-template #rama let-parentId>
      <ul>
        @for (n of hijosDe(parentId); track n.id) {
          <li>
            <div
              class="node"
              role="button"
              tabindex="0"
              [style.--node-color]="colorCss(n.color)"
              [class.is-selected]="seleccionadoId() === n.id"
              [class.is-match]="coincidencias()?.has(n.id)"
              [class.is-dimmed]="coincidencias() && !coincidencias()!.has(n.id)"
              (click)="seleccionar(n.id); $event.stopPropagation()"
              (keydown.enter)="seleccionar(n.id)"
            >
              <div class="node__cargo">{{ n.cargo || 'Sin cargo' }}</div>
              @if (n.area) {
                <div class="node__area">{{ n.area }}</div>
              }
              <div class="node__person" [class.is-vacante]="!persona(n)">
                <span class="node__avatar">{{ iniciales(n) }}</span>
                <span class="node__name">{{ persona(n) ?? 'Vacante' }}</span>
              </div>
              @if (hijosDe(n.id).length > 0) {
                <button class="node__toggle" type="button" [title]="colapsados().has(n.id) ? 'Expandir' : 'Contraer'"
                        (click)="alternar(n.id); $event.stopPropagation()">
                  {{ colapsados().has(n.id) ? '+' + contarDescendientes(n.id) : '−' }}
                </button>
              }
              @if (canEdit) {
                <button class="node__add" type="button" title="Agregar subordinado"
                        (click)="agregar(n.id); $event.stopPropagation()">
                  <i-lucide name="plus" [size]="12" [strokeWidth]="2.4" />
                </button>
              }
            </div>
            @if (hijosDe(n.id).length > 0 && !colapsados().has(n.id)) {
              <ng-container *ngTemplateOutlet="rama; context: { $implicit: n.id }" />
            }
          </li>
        }
      </ul>
    </ng-template>
  `,
  styles: [`
    .editor-page {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .editor-header { margin-bottom: 16px; }

    .back-link {
      align-items: center;
      color: var(--text-2);
      display: inline-flex;
      font-size: 13px;
      gap: 6px;
      margin-bottom: 6px;
      text-decoration: none;
    }

    .back-link:hover { color: var(--accent); }

    .editor-header__row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
    }

    .editor-title {
      align-items: center;
      display: flex;
      gap: 12px;
      min-width: 0;
    }

    .editor-title .page-title { margin: 0; }

    .dirty-chip {
      background: rgba(245, 166, 35, 0.14);
      border-radius: 999px;
      color: var(--amber);
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      white-space: nowrap;
    }

    .editor-actions {
      display: flex;
      gap: 8px;
    }

    .state-hint {
      color: var(--text-2);
      padding: 32px 0;
      text-align: center;
    }

    .workspace {
      align-items: flex-start;
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(0, 1fr) 320px;
    }

    .canvas-wrap {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    .toolbar {
      align-items: center;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
      padding: 10px 12px;
    }

    .search {
      align-items: center;
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      color: var(--text-3);
      display: flex;
      flex: 1 1 220px;
      gap: 8px;
      max-width: 340px;
      padding: 0 12px;
    }

    .search input {
      background: transparent;
      border: 0;
      color: var(--text);
      flex: 1;
      font-size: 13px;
      min-width: 0;
      outline: none;
      padding: 8px 0;
    }

    .toolbar__group {
      align-items: center;
      display: flex;
      gap: 6px;
    }

    .divider {
      background: var(--border-strong);
      height: 20px;
      margin: 0 4px;
      width: 1px;
    }

    .icon-button.sm {
      height: 32px;
      width: 34px;
    }

    .icon-button:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    .zoom-label {
      background: transparent;
      border: 0;
      color: var(--text-2);
      font-size: 12px;
      font-weight: 700;
      min-width: 44px;
    }

    .canvas {
      background-color: var(--bg);
      background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 18px 18px;
      height: calc(100vh - 300px);
      min-height: 420px;
      overflow: auto;
      padding: 28px;
    }

    .canvas-empty {
      align-items: center;
      color: var(--text-2);
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      justify-content: center;
    }

    .canvas-empty i-lucide { color: var(--accent); }
    .canvas-empty p { margin: 0 0 6px; }

    /* ── Árbol: conectores con pseudo-elementos ─────────────────────────── */
    .tree {
      --line: rgba(255, 255, 255, 0.18);
      margin: 0 auto;
      width: max-content;
    }

    .tree ul {
      display: flex;
      justify-content: center;
      list-style: none;
      margin: 0;
      padding: 24px 0 0;
      position: relative;
    }

    .tree li {
      align-items: center;
      display: flex;
      flex-direction: column;
      padding: 24px 8px 0;
      position: relative;
    }

    .tree li::before,
    .tree li::after {
      border-top: 2px solid var(--line);
      content: '';
      height: 24px;
      position: absolute;
      right: 50%;
      top: 0;
      width: 50%;
    }

    .tree li::after {
      border-left: 2px solid var(--line);
      left: 50%;
      right: auto;
    }

    .tree li:only-child::before,
    .tree li:only-child::after { display: none; }

    .tree li:only-child { padding-top: 0; }

    .tree li:first-child::before,
    .tree li:last-child::after { border: 0 none; }

    .tree li:last-child::before {
      border-radius: 0 8px 0 0;
      border-right: 2px solid var(--line);
    }

    .tree li:first-child::after { border-radius: 8px 0 0 0; }

    .tree ul ul::before {
      border-left: 2px solid var(--line);
      content: '';
      height: 24px;
      left: calc(50% - 1px);
      position: absolute;
      top: 0;
    }

    /* El nivel raíz no tiene jefe común: sin conectores entre raíces. */
    .tree > ul { gap: 32px; padding-top: 0; }
    .tree > ul > li { padding-top: 0; }
    .tree > ul > li::before,
    .tree > ul > li::after { display: none; }

    /* ── Tarjeta de posición ───────────────────────────────────────────── */
    .node {
      --node-color: var(--accent);
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: 12px;
      border-top: 3px solid var(--node-color);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px 12px;
      position: relative;
      text-align: left;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
      width: 196px;
    }

    .node:hover { border-color: color-mix(in srgb, var(--node-color) 55%, transparent); }

    .node:focus-visible {
      outline: 2px solid var(--node-color);
      outline-offset: 2px;
    }

    .node.is-selected {
      border-color: var(--node-color);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--node-color) 28%, transparent);
    }

    .node.is-match { box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.55); }
    .node.is-dimmed { opacity: 0.35; }

    .node__cargo {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .node__area {
      align-self: flex-start;
      background: color-mix(in srgb, var(--node-color) 16%, transparent);
      border-radius: 999px;
      color: var(--node-color);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
    }

    .node__person {
      align-items: center;
      color: var(--text-2);
      display: flex;
      font-size: 12px;
      gap: 8px;
      min-width: 0;
    }

    .node__person.is-vacante { color: var(--text-3); font-style: italic; }

    .node__avatar {
      align-items: center;
      background: color-mix(in srgb, var(--node-color) 20%, transparent);
      border-radius: 50%;
      color: var(--node-color);
      display: inline-flex;
      flex: 0 0 auto;
      font-family: var(--font-head);
      font-size: 10px;
      font-style: normal;
      font-weight: 800;
      height: 26px;
      justify-content: center;
      width: 26px;
    }

    .node__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .node__toggle,
    .node__add {
      align-items: center;
      background: var(--bg-4);
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      bottom: -11px;
      color: var(--text-2);
      display: inline-flex;
      font-size: 11px;
      font-weight: 700;
      height: 22px;
      justify-content: center;
      min-width: 22px;
      padding: 0 6px;
      position: absolute;
      z-index: 1;
    }

    .node__toggle { left: 50%; transform: translateX(-50%); }
    .node__add { opacity: 0; right: 10px; transition: opacity 0.15s ease; }
    .node:hover .node__add,
    .node.is-selected .node__add,
    .node__add:focus-visible { opacity: 1; }

    .node__toggle:hover,
    .node__add:hover { border-color: var(--node-color); color: var(--node-color); }

    /* ── Panel lateral ─────────────────────────────────────────────────── */
    .side {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      max-height: calc(100vh - 190px);
      overflow-y: auto;
      padding: 14px 16px 16px;
      position: sticky;
      top: 12px;
    }

    .side__header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .side__header h2 {
      font-family: var(--font-head);
      font-size: 15px;
      margin: 0;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .form-label {
      color: var(--text-2);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    textarea.form-input { min-height: 70px; }

    .segmented {
      background: var(--bg-3);
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      display: flex;
      padding: 3px;
    }

    .segmented button {
      background: transparent;
      border: 0;
      border-radius: 999px;
      color: var(--text-2);
      flex: 1;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 4px;
    }

    .segmented button.is-active {
      background: rgba(79, 142, 247, 0.18);
      color: var(--accent);
    }

    .user-option {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }

    .user-option small { color: var(--text-3); }

    .row-buttons {
      display: flex;
      gap: 8px;
    }

    .swatches {
      display: flex;
      gap: 8px;
    }

    .swatch {
      background: var(--swatch);
      border: 2px solid transparent;
      border-radius: 50%;
      height: 24px;
      outline: none;
      width: 24px;
    }

    .swatch.is-active {
      border-color: var(--text);
      box-shadow: 0 0 0 2px var(--bg-2) inset;
    }

    .swatch:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

    .side__actions {
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 14px;
    }

    .side__actions .btn { justify-content: center; }

    .details {
      display: grid;
      gap: 4px 0;
      margin: 0;
    }

    .details dt {
      color: var(--text-3);
      font-size: 11px;
      font-weight: 700;
      margin-top: 8px;
      text-transform: uppercase;
    }

    .details dd {
      color: var(--text);
      margin: 0;
    }

    .details dd small {
      color: var(--text-2);
      display: block;
    }

    .details .pre { white-space: pre-wrap; }

    .stats {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, 1fr);
      margin-bottom: 12px;
    }

    .stats div {
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
    }

    .stats strong {
      font-family: var(--font-head);
      font-size: 20px;
    }

    .stats span {
      color: var(--text-2);
      font-size: 12px;
    }

    .side__hint {
      color: var(--text-2);
      font-size: 13px;
      margin: 0;
    }

    .side__error {
      background: rgba(229, 83, 83, 0.12);
      border-radius: var(--radius);
      color: var(--red);
      font-size: 13px;
      margin: 12px 0 0;
      padding: 8px 10px;
    }

    @media (max-width: 1100px) {
      .workspace { grid-template-columns: 1fr; }
      .side { max-height: none; position: static; }
      .canvas { height: 60vh; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrganigramaEditorPage {
  private readonly service = inject(OrganigramasService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly organigramaId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly canEdit = inject(AuthService).hasPermission('organigramas.editar');
  protected readonly colores = COLORES;
  protected readonly zoomMin = ZOOM_MIN;
  protected readonly zoomMax = ZOOM_MAX;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly organigrama = signal<Organigrama | null>(null);
  readonly nombre = signal('');
  readonly descripcion = signal('');
  readonly nodos = signal<NodoEdit[]>([]);
  readonly usuarios = signal<OrganigramaUsuario[]>([]);
  readonly seleccionadoId = signal<string | null>(null);
  readonly modoPersona = signal<ModoPersona>('vacante');
  readonly colapsados = signal<ReadonlySet<string>>(new Set());
  readonly zoom = signal(1);
  readonly busqueda = signal('');
  private readonly snapshot = signal('');

  readonly payload = computed<OrganigramaPayload>(() => ({
    nombre: this.nombre().trim(),
    descripcion: this.descripcion().trim(),
    nodos: this.nodos()
  }));

  readonly dirty = computed(() => !!this.organigrama() && JSON.stringify(this.payload()) !== this.snapshot());

  readonly errorValidacion = computed<string | null>(() => {
    if (!this.nombre().trim()) return 'El organigrama necesita un nombre.';
    const sinCargo = this.nodos().filter((n) => !n.cargo.trim()).length;
    if (sinCargo > 0) return `Hay ${sinCargo} posición(es) sin cargo.`;
    return null;
  });

  readonly nodosById = computed(() => new Map(this.nodos().map((n) => [n.id, n])));
  readonly usuariosById = computed(() => new Map(this.usuarios().map((u) => [u.id, u])));

  private readonly hijos = computed(() => {
    const map = new Map<string | null, NodoEdit[]>();
    for (const n of this.nodos()) {
      const grupo = map.get(n.parentId) ?? [];
      grupo.push(n);
      map.set(n.parentId, grupo);
    }
    for (const grupo of map.values()) grupo.sort((a, b) => a.orden - b.orden);
    return map;
  });

  readonly seleccionado = computed(() => {
    const id = this.seleccionadoId();
    return id ? this.nodosById().get(id) ?? null : null;
  });

  readonly totalAsignados = computed(() => this.nodos().filter((n) => !!this.persona(n)).length);

  readonly cargosSugeridos = computed(() => this.unicos(this.nodos().map((n) => n.cargo)));
  readonly areasSugeridas = computed(() => this.unicos(this.nodos().map((n) => n.area)));

  /** Ids que coinciden con la búsqueda; null si no hay búsqueda activa. */
  readonly coincidencias = computed<ReadonlySet<string> | null>(() => {
    const q = this.normalizarTexto(this.busqueda());
    if (!q) return null;
    return new Set(
      this.nodos()
        .filter((n) => [n.cargo, n.area, this.persona(n) ?? ''].some((t) => this.normalizarTexto(t).includes(q)))
        .map((n) => n.id)
    );
  });

  /** Candidatos a jefe del nodo seleccionado: todos menos él mismo y sus descendientes. */
  readonly padresPosibles = computed(() => {
    const sel = this.seleccionado();
    if (!sel) return [];
    const excluidos = new Set([sel.id, ...this.descendientes(sel.id)]);
    return this.nodos()
      .filter((n) => !excluidos.has(n.id))
      .map((n) => ({ id: n.id, etiqueta: this.persona(n) ? `${n.cargo} · ${this.persona(n)}` : n.cargo }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
  });

  readonly zoomPct = computed(() => Math.round(this.zoom() * 100));

  constructor() {
    this.load();
  }

  // ── Navegación / atajos ────────────────────────────────────────────────

  canLeave(): boolean {
    return !this.dirty() || confirm('Tienes cambios sin guardar en el organigrama. ¿Salir sin guardar?');
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && this.canEdit) {
      event.preventDefault();
      this.guardar();
    }
  }

  // ── Lectura del árbol ──────────────────────────────────────────────────

  protected hijosDe(parentId: string | null): NodoEdit[] {
    return this.hijos().get(parentId) ?? [];
  }

  protected contarDescendientes(id: string): number {
    return this.descendientes(id).length;
  }

  protected persona(n: NodoEdit): string | null {
    if (n.usuarioId) return this.usuariosById().get(n.usuarioId)?.nombreCompleto ?? 'Usuario del portal';
    return n.nombreLibre.trim() || null;
  }

  protected iniciales(n: NodoEdit): string {
    if (n.usuarioId) {
      const u = this.usuariosById().get(n.usuarioId);
      if (u?.iniciales) return u.iniciales;
    }
    const nombre = this.persona(n);
    if (!nombre) return '?';
    const partes = nombre.split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  protected colorCss(valor: string): string {
    return COLORES.find((c) => c.valor === valor)?.css ?? COLORES[0].css;
  }

  protected puedeDesplazar(n: NodoEdit, delta: number): boolean {
    const hermanos = this.hijosDe(n.parentId);
    const idx = hermanos.findIndex((h) => h.id === n.id);
    return idx + delta >= 0 && idx + delta < hermanos.length;
  }

  protected readonly buscarUsuario = (term: string, item: OrganigramaUsuario): boolean => {
    const q = this.normalizarTexto(term);
    return [item.nombreCompleto, item.correo, item.puesto].some((t) => this.normalizarTexto(t).includes(q));
  };

  // ── Interacción ────────────────────────────────────────────────────────

  protected seleccionar(id: string | null): void {
    this.seleccionadoId.set(id);
    const n = id ? this.nodosById().get(id) : null;
    this.modoPersona.set(n?.usuarioId ? 'usuario' : n?.nombreLibre ? 'libre' : 'vacante');
  }

  protected alternar(id: string): void {
    this.colapsados.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected expandirTodo(): void {
    this.colapsados.set(new Set());
  }

  protected contraerTodo(): void {
    this.colapsados.set(new Set(this.nodos().filter((n) => n.parentId).map((n) => n.parentId!)));
  }

  protected cambiarZoom(delta: number): void {
    this.zoom.update((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 10) / 10)));
  }

  // ── Edición ────────────────────────────────────────────────────────────

  protected patch(id: string, changes: Partial<NodoEdit>): void {
    this.nodos.update((list) => list.map((n) => (n.id === id ? { ...n, ...changes } : n)));
  }

  protected cambiarModo(id: string, modo: ModoPersona): void {
    this.modoPersona.set(modo);
    if (modo === 'usuario') this.patch(id, { nombreLibre: '' });
    else if (modo === 'libre') this.patch(id, { usuarioId: null });
    else this.patch(id, { usuarioId: null, nombreLibre: '' });
  }

  /** Agrega una posición bajo `parentId`; `orden` fraccional permite insertarla entre dos pares. */
  protected agregar(parentId: string | null, orden = Number.MAX_SAFE_INTEGER): void {
    const nuevo: NodoEdit = {
      id: crypto.randomUUID(),
      parentId,
      cargo: 'Nueva posición',
      area: parentId ? this.nodosById().get(parentId)?.area ?? '' : '',
      nombreLibre: '',
      usuarioId: null,
      notas: '',
      color: parentId ? this.nodosById().get(parentId)?.color ?? '' : '',
      orden
    };
    this.nodos.update((list) => normalizar([...list, nuevo]));
    if (parentId) {
      this.colapsados.update((set) => {
        const next = new Set(set);
        next.delete(parentId);
        return next;
      });
    }
    this.seleccionar(nuevo.id);
    setTimeout(() => {
      const input = document.getElementById('nodo-cargo') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  protected moverA(id: string, parentId: string | null): void {
    const actual = this.nodosById().get(id);
    if (!actual || actual.parentId === parentId) return;
    if (parentId && (parentId === id || this.descendientes(id).includes(parentId))) return;
    this.nodos.update((list) =>
      normalizar(list.map((n) => (n.id === id ? { ...n, parentId, orden: Number.MAX_SAFE_INTEGER } : n)))
    );
  }

  protected desplazar(id: string, delta: number): void {
    const n = this.nodosById().get(id);
    if (!n || !this.puedeDesplazar(n, delta)) return;
    const hermanos = this.hijosDe(n.parentId);
    const idx = hermanos.findIndex((h) => h.id === id);
    const otro = hermanos[idx + delta];
    this.nodos.update((list) =>
      list.map((x) => (x.id === id ? { ...x, orden: otro.orden } : x.id === otro.id ? { ...x, orden: n.orden } : x))
    );
  }

  /**
   * Elimina la posición. Con `conRama` se va también todo lo que depende de ella; si no, sus
   * subordinados directos suben un nivel y ocupan su lugar. Los cambios quedan pendientes de guardar.
   */
  protected eliminar(n: NodoEdit, conRama: boolean): void {
    const descendientes = this.descendientes(n.id);
    const destino = n.parentId ? `"${this.nodosById().get(n.parentId)?.cargo}"` : 'el nivel superior';
    const mensaje = conRama
      ? `¿Eliminar "${n.cargo}" y sus ${descendientes.length} posición(es) subordinadas?`
      : descendientes.length > 0
        ? `¿Eliminar solo "${n.cargo}"? Sus subordinados directos pasarán a depender de ${destino}.`
        : `¿Eliminar la posición "${n.cargo}"?`;
    if (!confirm(mensaje)) return;

    const eliminar = new Set(conRama ? [n.id, ...descendientes] : [n.id]);
    const hijosDirectos = this.hijosDe(n.id);
    this.nodos.update((list) =>
      normalizar(
        list
          .filter((x) => !eliminar.has(x.id))
          .map((x) => {
            // Los hijos directos ocupan el lugar del nodo eliminado, manteniendo su orden.
            const idx = hijosDirectos.findIndex((h) => h.id === x.id);
            return idx >= 0 ? { ...x, parentId: n.parentId, orden: n.orden + (idx + 1) / (hijosDirectos.length + 1) } : x;
          })
      )
    );
    this.seleccionar(null);
  }

  protected descartar(): void {
    if (!confirm('¿Descartar todos los cambios sin guardar?')) return;
    const org = this.organigrama();
    if (org) this.aplicar(org);
  }

  protected guardar(): void {
    if (!this.dirty() || this.saving() || this.errorValidacion()) return;

    this.saving.set(true);
    this.service.update(this.organigramaId, this.payload()).subscribe({
      next: (org) => {
        this.saving.set(false);
        this.aplicar(org, true);
        this.snackBar.open('Organigrama guardado.', 'Cerrar', { duration: 2800 });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.snackBar.open(apiErrorMessage(error, 'No se pudo guardar el organigrama.'), 'Cerrar', { duration: 4200 });
      }
    });
  }

  // ── Carga / estado ─────────────────────────────────────────────────────

  private load(): void {
    this.service.getById(this.organigramaId).subscribe({
      next: (org) => {
        this.aplicar(org);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.snackBar.open(apiErrorMessage(error, 'No se pudo cargar el organigrama.'), 'Cerrar', { duration: 4200 });
      }
    });

    if (this.canEdit) {
      this.service.getUsuariosDisponibles().subscribe({
        next: (usuarios) => this.mergeUsuarios(usuarios),
        error: () => this.snackBar.open('No se pudo cargar la lista de usuarios.', 'Cerrar', { duration: 4200 })
      });
    }
  }

  private aplicar(org: Organigrama, conservarSeleccion = false): void {
    this.organigrama.set(org);
    this.nombre.set(org.nombre);
    this.descripcion.set(org.descripcion);
    this.nodos.set(normalizar(org.nodos.map(toEdit)));
    this.mergeUsuarios(org.nodos.flatMap((n) => (n.usuario ? [n.usuario] : [])));
    this.snapshot.set(JSON.stringify(this.payload()));
    if (!conservarSeleccion || !this.nodosById().has(this.seleccionadoId() ?? '')) this.seleccionar(null);
  }

  private mergeUsuarios(nuevos: OrganigramaUsuario[]): void {
    this.usuarios.update((actuales) => {
      const map = new Map(actuales.map((u) => [u.id, u]));
      for (const u of nuevos) map.set(u.id, u);
      return [...map.values()].sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
    });
  }

  private descendientes(id: string): string[] {
    const result: string[] = [];
    const pendientes = [id];
    while (pendientes.length > 0) {
      for (const hijo of this.hijosDe(pendientes.pop()!)) {
        result.push(hijo.id);
        pendientes.push(hijo.id);
      }
    }
    return result;
  }

  private unicos(valores: string[]): string[] {
    return [...new Set(valores.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  private normalizarTexto(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
}
