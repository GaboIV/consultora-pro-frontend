import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule } from 'lucide-angular';

import {
  ConnCommand,
  CredencialListItem,
  CredencialReveal,
  FORMATO_SECRETO_META,
  FormatoSecretoMeta,
  buildRdpFileContent,
  connectionCommands,
  detectarFormatoSecreto,
  tipoCredencialMeta
} from '../../core/models/credenciales.models';
import { schemaDe } from '../../core/models/credencial-schema';
import { CredencialesService } from '../../core/services/credenciales.service';

const CLIPBOARD_CLEAR_MS = 20_000;

/**
 * Bóveda de revelado temporal: muestra el secreto descifrado en memoria solo
 * durante la cuenta regresiva. Se cierra al agotarse el tiempo o al cambiar de
 * pestaña, audita cada copiado de secreto y limpia el portapapeles tras ~20 s.
 */
@Component({
  selector: 'cp-credencial-reveal-dialog',
  standalone: true,
  imports: [LucideAngularModule, MatSnackBarModule],
  template: `
    <div class="cp-modal-overlay">
      <div class="cp-modal cp-modal--md reveal-dialog" (click)="$event.stopPropagation()">
        <header class="dialog-head">
          <div class="dialog-head-copy">
            <span class="credential-icon" [class]="'tone-' + meta().tone">
              <i-lucide [name]="meta().icon" [size]="18" [strokeWidth]="2.2" />
            </span>
            <div>
              <h2 class="dialog-title">{{ secret().nombre }}</h2>
              <p class="dialog-sub countdown" [class.urgent]="remainingSeconds() <= 10">
                <i-lucide name="clock" [size]="13" [strokeWidth]="2.2" />
                Se ocultará en {{ remainingSeconds() }}s · se cierra al cambiar de pestaña
              </p>
            </div>
          </div>
          <button class="icon-button" type="button" title="Cerrar" (click)="close()">
            <i-lucide name="x" [size]="16" [strokeWidth]="2.2" />
          </button>
        </header>

        <div class="dialog-body">
          <div class="conn-grid">
            @if (item().host) {
              <div class="conn-row">
                <span class="conn-label">Host</span>
                <span class="conn-value mono">{{ accessTarget() }}</span>
                <button class="icon-button" type="button" [title]="copiedKey() === 'host' ? 'Copiado' : 'Copiar'" (click)="copy(accessTarget(), 'host')">
                  <i-lucide [name]="copiedKey() === 'host' ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
                </button>
              </div>
            }
            @if (item().usuario) {
              <div class="conn-row">
                <span class="conn-label">Usuario</span>
                <span class="conn-value mono">{{ item().usuario }}</span>
                <button class="icon-button" type="button" [title]="copiedKey() === 'user' ? 'Copiado' : 'Copiar'" (click)="copy(item().usuario!, 'user')">
                  <i-lucide [name]="copiedKey() === 'user' ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
                </button>
              </div>
            }
            @if (item().url) {
              <div class="conn-row">
                <span class="conn-label">URL</span>
                <a class="conn-value mono conn-link" [href]="item().url" target="_blank" rel="noopener noreferrer">{{ item().url }}</a>
                <button class="icon-button" type="button" [title]="copiedKey() === 'url' ? 'Copiado' : 'Copiar'" (click)="copy(item().url!, 'url')">
                  <i-lucide [name]="copiedKey() === 'url' ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
                </button>
              </div>
            }
            @for (extra of camposExtraRows(); track extra.key) {
              <div class="conn-row">
                <span class="conn-label">{{ extra.label }}</span>
                <span class="conn-value mono">{{ extra.value }}</span>
                <button class="icon-button" type="button" [title]="copiedKey() === extra.key ? 'Copiado' : 'Copiar'" (click)="copy(extra.value, extra.key)">
                  <i-lucide [name]="copiedKey() === extra.key ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
                </button>
              </div>
            }
          </div>

          @if (commands().length > 0) {
            <div class="conn-string">
              <span class="form-label">{{ commands().length > 1 ? 'Cadenas de conexión' : 'Cadena de conexión' }}</span>
              @for (cmd of commands(); track cmd.label) {
                <div class="conn-string-row">
                  <span class="conn-format">{{ cmd.label }}</span>
                  <code>{{ cmd.command }}</code>
                  <button class="icon-button" type="button" [title]="copiedKey() === 'cmd-' + cmd.label ? 'Copiado' : 'Copiar'" (click)="copy(cmd.command, 'cmd-' + cmd.label)">
                    <i-lucide [name]="copiedKey() === 'cmd-' + cmd.label ? 'check' : 'copy'" [size]="15" [strokeWidth]="2.1" />
                  </button>
                </div>
              }
            </div>
          }

          @if (item().tipo === 'RDP' && rdpContent()) {
            <button class="btn btn-secondary btn-sm rdp-btn" type="button" (click)="downloadRdp()">
              <i-lucide name="monitor" [size]="14" [strokeWidth]="2.2" />
              Descargar acceso directo .rdp
            </button>
          }

          @if (item().notas) {
            <p class="reveal-notes"><i-lucide name="info" [size]="13" [strokeWidth]="2.2" /> {{ item().notas }}</p>
          }

          <div class="secret-label-row">
            <span class="form-label">{{ valorLabel() }}</span>
            @if (formato(); as fmt) {
              <span class="format-chip">
                <i-lucide [name]="formatoMeta(fmt).icon" [size]="12" [strokeWidth]="2.2" />
                {{ formatoMeta(fmt).label }}
              </span>
              <button class="btn btn-secondary btn-sm" type="button" (click)="downloadSecret()">
                <i-lucide name="download" [size]="13" [strokeWidth]="2.2" />
                Descargar .{{ formatoMeta(fmt).ext }}
              </button>
            }
            @if (esUrl()) {
              <a class="btn btn-secondary btn-sm" [href]="secret().valor.trim()" target="_blank" rel="noopener noreferrer">
                <i-lucide name="external-link" [size]="13" [strokeWidth]="2.2" />
                Abrir enlace
              </a>
            }
            <button class="btn btn-secondary btn-sm" type="button" (click)="copySecret(secret().valor, 'secret', 'secreto principal')">
              <i-lucide [name]="copiedKey() === 'secret' ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
              {{ copiedKey() === 'secret' ? '¡Copiado!' : 'Copiar' }}
            </button>
            <button class="btn btn-secondary btn-sm" type="button" [title]="isRevealed('main') ? 'Ocultar' : 'Mostrar'" (click)="toggleReveal('main')">
              <i-lucide [name]="isRevealed('main') ? 'eye-off' : 'eye'" [size]="14" [strokeWidth]="2.1" />
              {{ isRevealed('main') ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <pre class="secret-box" [class.masked]="!isRevealed('main')">{{ isRevealed('main') ? secret().valor : MASK }}</pre>

          @for (extra of secretosExtraRows(); track extra.key) {
            <div class="secret-label-row extra-secret">
              <span class="form-label">{{ extra.label }}</span>
              <button class="btn btn-secondary btn-sm" type="button" (click)="copySecret(extra.value, 'sec-' + extra.key, extra.label)">
                <i-lucide [name]="copiedKey() === 'sec-' + extra.key ? 'check' : 'copy'" [size]="14" [strokeWidth]="2.1" />
                {{ copiedKey() === 'sec-' + extra.key ? '¡Copiado!' : 'Copiar' }}
              </button>
              <button class="btn btn-secondary btn-sm" type="button" [title]="isRevealed('extra-' + extra.key) ? 'Ocultar' : 'Mostrar'" (click)="toggleReveal('extra-' + extra.key)">
                <i-lucide [name]="isRevealed('extra-' + extra.key) ? 'eye-off' : 'eye'" [size]="14" [strokeWidth]="2.1" />
                {{ isRevealed('extra-' + extra.key) ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <pre class="secret-box secondary" [class.masked]="!isRevealed('extra-' + extra.key)">{{ isRevealed('extra-' + extra.key) ? extra.value : MASK }}</pre>
          }

          <p class="vault-hint">
            <i-lucide name="shield-check" [size]="13" [strokeWidth]="2.2" />
            Revelado y copiado auditados. El portapapeles se limpia automáticamente ~20 s después de copiar un secreto.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-head {
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 20px 24px;
    }

    .dialog-head-copy {
      align-items: center;
      display: flex;
      gap: 12px;
      min-width: 0;
    }

    .credential-icon {
      align-items: center;
      background: color-mix(in srgb, var(--tone-color, var(--accent)) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--tone-color, var(--accent)) 28%, transparent);
      border-radius: var(--radius);
      color: var(--tone-color, var(--accent));
      display: inline-flex;
      flex: 0 0 auto;
      height: 40px;
      justify-content: center;
      width: 40px;
    }

    .credential-icon.tone-blue { --tone-color: var(--accent); }
    .credential-icon.tone-green { --tone-color: var(--green); }
    .credential-icon.tone-amber { --tone-color: var(--amber); }
    .credential-icon.tone-purple { --tone-color: var(--purple); }
    .credential-icon.tone-red { --tone-color: var(--red); }
    .credential-icon.tone-teal { --tone-color: var(--teal); }
    .credential-icon.tone-gray { --tone-color: var(--text-3); }

    .dialog-title {
      color: var(--text);
      font-family: var(--font-head);
      font-size: 19px;
      font-weight: 700;
      margin: 0;
    }

    .dialog-sub.countdown {
      align-items: center;
      color: var(--amber);
      display: flex;
      font-size: 12px;
      gap: 5px;
      margin: 3px 0 0;
    }

    .dialog-sub.countdown.urgent {
      animation: count-pulse 1s ease infinite;
      color: var(--red);
    }

    @keyframes count-pulse {
      50% { opacity: 0.55; }
    }

    .dialog-body {
      overflow-y: auto;
      padding: 22px 24px;
    }

    .form-label {
      color: var(--text-2);
      display: block;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .conn-grid {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .conn-row {
      align-items: center;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      display: grid;
      gap: 12px;
      grid-template-columns: 110px 1fr auto;
      padding: 8px 10px 8px 14px;
    }

    .conn-label {
      color: var(--text-3);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .conn-value {
      color: var(--text);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .conn-value.mono { font-family: var(--font-mono); font-size: 13px; }
    .conn-link { color: var(--teal); text-decoration: none; }
    .conn-link:hover { text-decoration: underline; }

    .conn-string { margin-bottom: 16px; }

    .conn-string-row {
      align-items: center;
      background: #07090d;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      display: flex;
      gap: 10px;
      margin-top: 6px;
      padding: 8px 8px 8px 12px;
    }

    .conn-format {
      background: rgba(79, 142, 247, 0.12);
      border-radius: 999px;
      color: var(--accent);
      flex-shrink: 0;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 9px;
      text-transform: uppercase;
    }

    .conn-string-row code {
      color: var(--teal);
      flex: 1;
      font-family: var(--font-mono);
      font-size: 12.5px;
      overflow-x: auto;
      white-space: nowrap;
    }

    .rdp-btn { margin-bottom: 16px; }

    .reveal-notes {
      align-items: center;
      color: var(--text-2);
      display: flex;
      font-size: 12px;
      gap: 6px;
      margin: 0 0 16px;
    }

    .secret-label-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .secret-label-row .form-label { margin-bottom: 0; }
    .extra-secret { margin-top: 14px; }

    .format-chip {
      align-items: center;
      background: rgba(79, 142, 247, 0.1);
      border: 1px solid rgba(79, 142, 247, 0.22);
      border-radius: 999px;
      color: var(--accent);
      display: inline-flex;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      gap: 5px;
      padding: 3px 10px;
      white-space: nowrap;
    }

    .secret-box {
      background: #07090d;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--green);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
      max-height: 260px;
      overflow: auto;
      padding: 14px 16px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .secret-box.secondary { color: var(--teal); }

    .secret-box.masked {
      color: var(--text-3);
      letter-spacing: 3px;
      user-select: none;
    }

    .vault-hint {
      align-items: center;
      color: var(--text-3);
      display: flex;
      font-size: 11.5px;
      gap: 6px;
      margin: 16px 0 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredencialRevealDialogComponent implements OnInit, OnDestroy {
  private readonly service = inject(CredencialesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly item = input.required<CredencialListItem>();
  readonly secret = input.required<CredencialReveal>();
  readonly closed = output<void>();

  /** Máscara fija (no refleja la longitud real del secreto). */
  protected readonly MASK = '••••••••••••';

  protected readonly remainingSeconds = signal(0);
  protected readonly copiedKey = signal<string | null>(null);
  /** Claves de secretos actualmente visibles a simple vista. */
  protected readonly revealedSecrets = signal<Set<string>>(new Set());

  protected readonly meta = computed(() => tipoCredencialMeta(this.item().tipo));
  protected readonly commands = computed<ConnCommand[]>(() => connectionCommands(this.item()));
  protected readonly formato = computed(() => detectarFormatoSecreto(this.secret().valor));
  protected readonly rdpContent = computed(() => buildRdpFileContent(this.item()));
  protected readonly valorLabel = computed(() => schemaDe(this.item().tipo).valorLabel);

  protected readonly esUrl = computed(() => {
    try {
      const url = new URL(this.secret().valor.trim());
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  });

  protected readonly accessTarget = computed(() => {
    const item = this.item();
    return item.puerto ? `${item.host}:${item.puerto}` : (item.host ?? '');
  });

  protected readonly camposExtraRows = computed(() => {
    const schema = schemaDe(this.item().tipo);
    const extra = this.item().camposExtra ?? {};
    return Object.entries(extra).map(([key, value]) => ({
      key,
      value,
      label: schema.campos.find(c => c.key === key)?.label.replace(/\s*\(opcional\)\s*/i, '') ?? key
    }));
  });

  protected readonly secretosExtraRows = computed(() => {
    const schema = schemaDe(this.item().tipo);
    const extras = this.secret().secretosExtra ?? {};
    return Object.entries(extras).map(([key, value]) => ({
      key,
      value,
      label: schema.campos.find(c => c.key === key)?.label.replace(/\s*\(opcional\)\s*/i, '') ?? key
    }));
  });

  private countdown: ReturnType<typeof setInterval> | null = null;
  private clipboardClear: ReturnType<typeof setTimeout> | null = null;
  private copiedReset: ReturnType<typeof setTimeout> | null = null;
  private readonly onVisibility = (): void => {
    if (document.hidden) this.close();
  };

  ngOnInit(): void {
    this.remainingSeconds.set(this.secret().visiblePorSegundos || 30);
    this.countdown = setInterval(() => {
      const next = this.remainingSeconds() - 1;
      if (next <= 0) {
        this.close();
        return;
      }
      this.remainingSeconds.set(next);
    }, 1000);

    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    if (this.countdown) clearInterval(this.countdown);
    if (this.copiedReset) clearTimeout(this.copiedReset);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected isRevealed(key: string): boolean {
    return this.revealedSecrets().has(key);
  }

  protected toggleReveal(key: string): void {
    const next = new Set(this.revealedSecrets());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.revealedSecrets.set(next);
  }

  protected copy(value: string | number | null | undefined, key: string): void {
    const text = value == null ? '' : String(value);
    if (!text || !navigator.clipboard) return;

    navigator.clipboard.writeText(text).then(() => this.markCopied(key)).catch(() => {
      this.snackBar.open('No se pudo copiar al portapapeles.', 'Cerrar', { duration: 2600 });
    });
  }

  /** Copia auditada de un secreto + limpieza diferida del portapapeles. */
  protected copySecret(value: string, key: string, campo: string): void {
    if (!value || !navigator.clipboard) return;

    navigator.clipboard.writeText(value).then(() => {
      this.markCopied(key);
      this.service.registrarCopiado(this.item().id, campo).subscribe({ error: () => void 0 });
      this.scheduleClipboardClear();
    }).catch(() => {
      this.snackBar.open('No se pudo copiar al portapapeles.', 'Cerrar', { duration: 2600 });
    });
  }

  protected downloadSecret(): void {
    const formato = this.formato();
    if (!formato) return;

    const meta = FORMATO_SECRETO_META[formato];
    this.downloadBlob(this.secret().valor, meta.mime, `${this.secret().nombre}.${meta.ext}`);
    this.service.registrarCopiado(this.item().id, `descarga .${meta.ext}`).subscribe({ error: () => void 0 });
  }

  protected downloadRdp(): void {
    const content = this.rdpContent();
    if (!content) return;
    this.downloadBlob(content, 'application/x-rdp', `${this.item().nombre}.rdp`);
  }

  protected formatoMeta(formato: NonNullable<ReturnType<typeof detectarFormatoSecreto>>): FormatoSecretoMeta {
    return FORMATO_SECRETO_META[formato];
  }

  private markCopied(key: string): void {
    this.copiedKey.set(key);
    if (this.copiedReset) clearTimeout(this.copiedReset);
    this.copiedReset = setTimeout(() => {
      if (this.copiedKey() === key) this.copiedKey.set(null);
    }, 2000);
  }

  /** Limpia el portapapeles ~20 s después de copiar un secreto, si el navegador lo permite. */
  private scheduleClipboardClear(): void {
    if (this.clipboardClear) clearTimeout(this.clipboardClear);
    this.clipboardClear = setTimeout(() => {
      if (document.hasFocus()) {
        navigator.clipboard?.writeText('').catch(() => void 0);
      }
    }, CLIPBOARD_CLEAR_MS);
  }

  private downloadBlob(content: string, mime: string, filename: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
