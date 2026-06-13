import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ManagementFacade } from '../../core/data-access/management.facade';
import { ImportResult, tipoCredencialMeta } from '../../core/models/credenciales.models';
import { AmbientesService } from '../../core/services/ambientes.service';
import { CredencialesService } from '../../core/services/credenciales.service';
import { apiErrorMessage } from '../../core/utils/api-error-message';
import { FilaImportada, aImportRow, descargarPlantilla, parsearExcel } from './credencial-excel';

type Paso = 'subir' | 'preview' | 'resultado';

/**
 * Importación masiva desde Excel: plantilla multipestaña, pre-visualización
 * con validación rigurosa por fila (errores exactos en rojo) y la opción de
 * importar solo las filas válidas.
 */
@Component({
  selector: 'cp-credencial-import-dialog',
  standalone: true,
  imports: [LucideAngularModule, MatSnackBarModule],
  template: `
    <div class="cp-modal-overlay">
      <div class="cp-modal import-dialog" (click)="$event.stopPropagation()">
        <header class="dialog-head">
          <div class="dialog-head-copy">
            <span class="credential-icon tone-green">
              <i-lucide name="file-spreadsheet" [size]="18" [strokeWidth]="2.2" />
            </span>
            <div>
              <h2 class="dialog-title">Importar credenciales</h2>
              <p class="dialog-sub">Plantilla Excel multipestaña · validación fila por fila antes de guardar.</p>
            </div>
          </div>
          <button class="icon-button" type="button" title="Cerrar" (click)="close()">
            <i-lucide name="x" [size]="16" [strokeWidth]="2.2" />
          </button>
        </header>

        <div class="dialog-body">
          @switch (paso()) {
            @case ('subir') {
              <div class="template-row">
                <div>
                  <h3>1 · Descarga la plantilla</h3>
                  <p>Una pestaña por tipo de credencial con sus columnas etiquetadas y una fila de ejemplo como guía.</p>
                </div>
                <button class="btn btn-secondary" type="button" (click)="descargarPlantilla()">
                  <i-lucide name="download" [size]="15" [strokeWidth]="2.2" />
                  Plantilla .xlsx
                </button>
              </div>

              <h3>2 · Sube el archivo completado</h3>
              <label
                class="upload-zone"
                [class.dragging]="dragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="dragging.set(false)"
                (drop)="onDrop($event)"
              >
                <i-lucide name="upload" [size]="26" [strokeWidth]="1.8" />
                <strong>Arrastra el Excel aquí o haz clic para buscarlo</strong>
                <span>.xlsx · máximo 500 filas por importación</span>
                <input type="file" style="display:none" accept=".xlsx,.xls,.csv" (change)="onFileSelected($event)" />
              </label>

              @if (parsing()) {
                <p class="parsing-note"><i-lucide name="loader-circle" [size]="14" [strokeWidth]="2.2" class="spin" /> Procesando archivo…</p>
              }
            }

            @case ('preview') {
              <div class="preview-summary">
                <span class="pill ok"><i-lucide name="check" [size]="13" [strokeWidth]="2.4" /> {{ validas().length }} válidas</span>
                @if (invalidas().length > 0) {
                  <span class="pill bad"><i-lucide name="triangle-alert" [size]="13" [strokeWidth]="2.4" /> {{ invalidas().length }} con errores</span>
                }
                <span class="muted">Corrige el archivo y vuelve a subirlo, o importa solo las filas válidas.</span>
              </div>

              <div class="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Hoja</th>
                      <th>Credencial</th>
                      <th>Proyecto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (fila of filas(); track fila.hoja + '-' + fila.fila) {
                      <tr [class.row-error]="fila.errores.length > 0">
                        <td class="mono">{{ fila.fila }}</td>
                        <td>{{ fila.hoja }}</td>
                        <td>
                          <div class="row-name">{{ fila.nombre || '—' }}</div>
                          <p class="item-meta">{{ tipoLabel(fila) }}</p>
                        </td>
                        <td>{{ fila.proyectoTexto || '—' }}</td>
                        <td>
                          @if (fila.errores.length === 0) {
                            <span class="estado-ok"><i-lucide name="check" [size]="13" [strokeWidth]="2.4" /> Válida</span>
                          } @else {
                            @for (error of fila.errores; track error) {
                              <p class="estado-error">Fila {{ fila.fila }}: {{ error }}</p>
                            }
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @case ('resultado') {
              @if (resultado(); as res) {
                <div class="result-box" [class.with-errors]="res.errores.length > 0">
                  <i-lucide [name]="res.errores.length === 0 ? 'badge-check' : 'triangle-alert'" [size]="30" [strokeWidth]="1.8" />
                  <h3>{{ res.importadas }} de {{ res.total }} credenciales importadas</h3>
                  @if (res.errores.length > 0) {
                    <div class="result-errors">
                      @for (error of res.errores; track error.fila + error.error) {
                        <p>Fila {{ error.fila }} ({{ error.nombre || 'sin nombre' }}): {{ error.error }}</p>
                      }
                    </div>
                  } @else {
                    <p class="muted">Todas las filas se cifraron y guardaron correctamente.</p>
                  }
                </div>
              }
            }
          }
        </div>

        <footer class="dialog-actions">
          @switch (paso()) {
            @case ('subir') {
              <button class="btn btn-secondary" type="button" (click)="close()">Cancelar</button>
            }
            @case ('preview') {
              <button class="btn btn-secondary" type="button" (click)="reiniciar()">Subir otro archivo</button>
              <button class="btn btn-primary" type="button" [disabled]="validas().length === 0 || importing()" (click)="importar()">
                {{ importing() ? 'Importando…' : 'Importar ' + validas().length + ' válida(s)' }}
              </button>
            }
            @case ('resultado') {
              <button class="btn btn-primary" type="button" (click)="close()">Listo</button>
            }
          }
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .import-dialog { width: min(820px, calc(100vw - 32px)); }

    .dialog-head {
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 20px 24px;
    }

    .dialog-head-copy { align-items: center; display: flex; gap: 12px; }

    .credential-icon {
      align-items: center;
      background: color-mix(in srgb, var(--tone-color, var(--accent)) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--tone-color, var(--accent)) 28%, transparent);
      border-radius: var(--radius);
      color: var(--tone-color, var(--accent));
      display: inline-flex;
      height: 40px;
      justify-content: center;
      width: 40px;
    }

    .credential-icon.tone-green { --tone-color: var(--green); }

    .dialog-title {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 19px;
      font-weight: 700;
      margin: 0;
    }

    .dialog-sub { color: var(--text-3); font-size: 12px; margin: 3px 0 0; }

    .dialog-body { overflow-y: auto; padding: 22px 24px; }

    .dialog-body h3 {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 14px;
      margin: 0 0 6px;
    }

    .dialog-body p { color: var(--text-2); font-size: 13px; }

    .template-row {
      align-items: center;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 18px;
      padding: 16px 18px;
    }

    .template-row p { margin: 4px 0 0; }

    .upload-zone {
      align-items: center;
      border: 2px dashed var(--border-strong);
      border-radius: var(--radius-lg);
      color: var(--text-2);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 7px;
      justify-content: center;
      padding: 36px 20px;
      text-align: center;
      transition: border-color 0.16s ease, background-color 0.16s ease;
    }

    .upload-zone:hover, .upload-zone.dragging {
      background: color-mix(in srgb, var(--accent) 5%, transparent);
      border-color: var(--accent);
      color: var(--accent);
    }

    .upload-zone span { color: var(--text-3); font-size: 12px; }

    .parsing-note {
      align-items: center;
      color: var(--text-2);
      display: flex;
      gap: 7px;
      margin-top: 14px;
    }

    .spin { animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .preview-summary {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }

    .pill {
      align-items: center;
      border-radius: 999px;
      display: inline-flex;
      font-size: 12px;
      font-weight: 700;
      gap: 5px;
      padding: 4px 12px;
    }

    .pill.ok { background: color-mix(in srgb, var(--green) 12%, transparent); color: var(--green); }
    .pill.bad { background: color-mix(in srgb, var(--red) 12%, transparent); color: var(--red); }

    .muted { color: var(--text-3); font-size: 12px; }

    .preview-table {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      max-height: 420px;
      overflow: auto;
    }

    .preview-table table { border-collapse: collapse; width: 100%; }

    .preview-table th {
      background: var(--bg-3);
      color: var(--text-3);
      font-size: 11px;
      font-weight: 700;
      padding: 10px 12px;
      position: sticky;
      text-align: left;
      text-transform: uppercase;
      top: 0;
    }

    .preview-table td {
      border-top: 1px solid var(--border);
      color: var(--text-2);
      font-size: 13px;
      padding: 10px 12px;
      vertical-align: top;
    }

    .row-name { color: var(--text); font-weight: 600; }
    .item-meta { color: var(--text-3); font-size: 11.5px; margin: 2px 0 0; }
    .mono { font-family: var(--font-mono); }

    tr.row-error td { background: color-mix(in srgb, var(--red) 6%, transparent); }

    .estado-ok {
      align-items: center;
      color: var(--green);
      display: inline-flex;
      font-size: 12.5px;
      font-weight: 600;
      gap: 5px;
    }

    .estado-error {
      color: var(--red);
      font-size: 12px;
      margin: 2px 0;
    }

    .result-box {
      align-items: center;
      color: var(--green);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 26px 10px;
      text-align: center;
    }

    .result-box.with-errors { color: var(--amber); }
    .result-box h3 { color: var(--text); font-size: 17px; }

    .result-errors {
      background: color-mix(in srgb, var(--red) 7%, transparent);
      border: 1px solid color-mix(in srgb, var(--red) 22%, transparent);
      border-radius: var(--radius);
      margin-top: 8px;
      max-height: 220px;
      overflow: auto;
      padding: 12px 16px;
      text-align: left;
      width: 100%;
    }

    .result-errors p { color: var(--red); font-size: 12.5px; margin: 3px 0; }

    .dialog-actions {
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 16px 24px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredencialImportDialogComponent {
  private readonly service = inject(CredencialesService);
  private readonly ambientesService = inject(AmbientesService);
  private readonly facade = inject(ManagementFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  /** Emite true si se importó al menos una credencial. */
  readonly closed = output<boolean>();

  protected readonly paso = signal<Paso>('subir');
  protected readonly dragging = signal(false);
  protected readonly parsing = signal(false);
  protected readonly importing = signal(false);
  protected readonly filas = signal<FilaImportada[]>([]);
  protected readonly resultado = signal<ImportResult | null>(null);

  protected readonly validas = computed(() => this.filas().filter(f => f.errores.length === 0));
  protected readonly invalidas = computed(() => this.filas().filter(f => f.errores.length > 0));

  private importoAlgo = false;

  protected descargarPlantilla(): void {
    descargarPlantilla();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.procesarArchivo(file);
  }

  protected onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (file) this.procesarArchivo(file);
    fileInput.value = '';
  }

  protected reiniciar(): void {
    this.filas.set([]);
    this.paso.set('subir');
  }

  protected close(): void {
    this.closed.emit(this.importoAlgo);
  }

  protected tipoLabel(fila: FilaImportada): string {
    return tipoCredencialMeta(fila.tipo).label;
  }

  protected importar(): void {
    const filasValidas = this.validas();
    if (filasValidas.length === 0) return;

    this.importing.set(true);
    this.service.importar(filasValidas.map(aImportRow))
      .pipe(
        finalize(() => this.importing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (resultado) => {
          this.importoAlgo = resultado.importadas > 0;
          this.resultado.set(resultado);
          this.paso.set('resultado');
        },
        error: (error: unknown) => {
          this.snackBar.open(apiErrorMessage(error, 'No se pudo completar la importación.'), 'Cerrar', { duration: 4200 });
        }
      });
  }

  private procesarArchivo(file: File): void {
    this.parsing.set(true);

    file.arrayBuffer()
      .then(buffer => {
        const proyectos = this.facade.projects().map(p => ({ id: p.id, name: p.name, clientName: p.clientName }));
        const filas = parsearExcel(buffer, proyectos);

        if (filas.length === 0) {
          this.parsing.set(false);
          this.snackBar.open('El archivo no contiene filas de datos en las pestañas de la plantilla.', 'Cerrar', { duration: 4200 });
          return;
        }

        this.resolverAmbientes(filas);
      })
      .catch(() => {
        this.parsing.set(false);
        this.snackBar.open('No se pudo leer el archivo. ¿Es un .xlsx válido?', 'Cerrar', { duration: 4200 });
      });
  }

  /** Resuelve los nombres de ambiente contra los ambientes reales de cada proyecto. */
  private resolverAmbientes(filas: FilaImportada[]): void {
    const proyectosConAmbiente = [...new Set(
      filas.filter(f => f.ambienteTexto && f.proyectoId).map(f => f.proyectoId!)
    )];

    const consultas = proyectosConAmbiente.length
      ? forkJoin(proyectosConAmbiente.map(id =>
          this.ambientesService.getByProject(id).pipe(
            map(ambientes => ({ id, ambientes })),
            catchError(() => of({ id, ambientes: [] as { id: string; nombre: string }[] }))
          )
        ))
      : of([]);

    consultas
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(porProyecto => {
        const mapa = new Map(porProyecto.map(p => [p.id, p.ambientes]));

        for (const fila of filas) {
          if (!fila.ambienteTexto || !fila.proyectoId) continue;

          const ambientes = mapa.get(fila.proyectoId) ?? [];
          const buscado = fila.ambienteTexto.trim().toLowerCase();
          const match = ambientes.find(a => a.nombre.trim().toLowerCase() === buscado);

          if (match) fila.ambienteId = match.id;
          else fila.errores.push(`Ambiente "${fila.ambienteTexto}" no existe en el proyecto indicado`);
        }

        this.parsing.set(false);
        this.filas.set(filas);
        this.paso.set('preview');
      });
  }
}
