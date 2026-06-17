import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TablerosService } from '../../core/services/tableros.service';
import { AuthService } from '../../core/services/auth.service';
import { Tablero, ETIQUETA_COLORS } from '../../core/models/kanban.models';
import { apiErrorMessage } from '../../core/utils/api-error-message';

@Component({
  selector: 'cp-mis-tableros',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './mis-tableros.page.html',
  styleUrls: ['./mis-tableros.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MisTablerosPage implements OnInit {
  private readonly tablerosService = inject(TablerosService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly auth = inject(AuthService);

  protected readonly tableros = signal<Tablero[]>([]);
  protected readonly loading = signal(true);
  protected readonly creando = signal(false);
  protected readonly saving = signal(false);

  protected readonly tablerosDeProyecto = computed(() =>
    this.tableros().filter(t => !t.esPersonal));
  protected readonly tablerosPersonales = computed(() =>
    this.tableros().filter(t => t.esPersonal));

  protected nuevoNombre = '';
  protected nuevoColor = 'blue';
  protected readonly colorOptions = ETIQUETA_COLORS;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.tablerosService.getMisTableros().subscribe({
      next: (data) => {
        this.tableros.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudieron cargar los tableros.'), 'Cerrar', { duration: 4200 });
        this.loading.set(false);
      }
    });
  }

  protected openBoard(tablero: Tablero): void {
    if (tablero.esPersonal || !tablero.proyectoId) {
      this.router.navigate(['/mis-tableros', tablero.id]);
    } else {
      this.router.navigate(['/proyectos', tablero.proyectoId, 'tableros', tablero.id]);
    }
  }

  protected startCreate(): void {
    this.nuevoNombre = '';
    this.nuevoColor = 'blue';
    this.creando.set(true);
  }

  protected cancelCreate(): void {
    this.creando.set(false);
  }

  protected createPersonal(): void {
    const nombre = this.nuevoNombre.trim();
    if (!nombre) return;
    this.saving.set(true);
    this.tablerosService.create({ esPersonal: true, nombre, colorClass: this.nuevoColor }).subscribe({
      next: (t) => {
        this.tableros.update(list => [...list, t]);
        this.creando.set(false);
        this.saving.set(false);
        this.snackBar.open('Tablero personal creado.', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        this.snackBar.open(apiErrorMessage(err, 'No se pudo crear el tablero.'), 'Cerrar', { duration: 4200 });
        this.saving.set(false);
      }
    });
  }

  protected boardRoute(t: Tablero): string[] {
    return t.esPersonal || !t.proyectoId
      ? ['/mis-tableros', t.id]
      : ['/proyectos', t.proyectoId, 'tableros', t.id];
  }
}
