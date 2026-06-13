import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AlertaService } from '../../../core/services/alerta.service';
import { Alerta } from '../../../core/models/alerta.models';

@Component({
  selector: 'cp-alertas-dropdown',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './alertas-dropdown.component.html',
  styleUrls: ['./alertas-dropdown.component.scss']
})
export class AlertasDropdownComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);
  protected readonly alertaService = inject(AlertaService);

  readonly isOpen = signal(false);

  toggleDropdown(): void {
    this.isOpen.update(open => !open);
    if (this.isOpen()) {
      this.alertaService.fetchAlerts();
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

  onAlertClick(alerta: Alerta): void {
    this.alertaService.markAsRead(alerta.id);
    
    if (alerta.tipo === 'CredencialVencimiento') {
      void this.router.navigate(['/credenciales']);
    } else if (alerta.tipo === 'ProyectoVencimiento' && alerta.referenciaId) {
      void this.router.navigate(['/proyectos', alerta.referenciaId]);
    } else if (alerta.tipo === 'AmbienteAlerta' && alerta.referenciaId) {
      void this.router.navigate(['/ambientes', alerta.referenciaId]);
    }
    
    this.closeDropdown();
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.alertaService.markAllAsRead();
  }

  getIconName(tipo: string): string {
    switch (tipo) {
      case 'CredencialVencimiento':
        return 'key-round';
      case 'ProyectoVencimiento':
        return 'git-branch';
      case 'AmbienteAlerta':
        return 'server';
      default:
        return 'bell';
    }
  }
}
