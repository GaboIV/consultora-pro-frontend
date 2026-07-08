import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { Notificacion, TipoNotificacion } from '../../../core/models/notificaciones.models';

@Component({
  selector: 'cp-notificaciones-dropdown',
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './notificaciones-dropdown.component.html',
  styleUrls: ['./notificaciones-dropdown.component.scss']
})
export class NotificacionesDropdownComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);
  protected readonly notificacionesService = inject(NotificacionesService);

  readonly isOpen = signal(false);

  toggleDropdown(): void {
    this.isOpen.update((open) => !open);
    if (this.isOpen()) {
      this.notificacionesService.fetchNotificaciones();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  onNotificacionClick(notificacion: Notificacion): void {
    this.notificacionesService.marcarLeida(notificacion);
    if (notificacion.url) {
      void this.router.navigateByUrl(notificacion.url);
    }
    this.closeDropdown();
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.notificacionesService.marcarTodasLeidas();
  }

  loadMore(event: Event): void {
    event.stopPropagation();
    this.notificacionesService.cargarMas();
  }

  badgeLabel(count: number): string {
    return count > 9 ? '9+' : `${count}`;
  }

  getIconName(tipo: TipoNotificacion): string {
    switch (tipo) {
      case 'UsuarioBienvenida':
        return 'user-check';
      case 'PasswordCambiadaPorAdmin':
      case 'PasswordCambiada':
        return 'lock';
      case 'RolCambiado':
        return 'shield-check';
      case 'ProyectoAsignado':
      case 'ProyectoDesasignado':
        return 'git-branch';
      case 'TableroCompartido':
        return 'square-kanban';
      case 'TarjetaAsignada':
        return 'user-plus';
      case 'TarjetaDesasignada':
        return 'user-x';
      case 'TarjetaMovida':
        return 'columns-2';
      case 'TarjetaCompletada':
        return 'check';
      case 'TarjetaComentario':
        return 'message-square';
      case 'CredencialSolicitud':
      case 'CredencialSolicitudResuelta':
        return 'key-round';
      default:
        return 'bell';
    }
  }

  tiempoRelativo(fecha: string): string {
    const ms = Date.now() - new Date(fecha).getTime();
    const minutos = Math.floor(ms / 60000);
    if (minutos < 1) return 'Ahora mismo';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }
}
