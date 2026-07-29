import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  icon: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  // Simulator State
  protected readonly selectedServices = signal<string[]>(['web']);
  protected readonly complexity = signal<string>('medium'); // small, medium, large
  protected readonly urgency = signal<string>('standard'); // standard, fast

  protected readonly serviceOptions: ServiceOption[] = [
    { id: 'web', name: 'Web Dev & Software', price: 2500, icon: 'fa-code' },
    { id: 'automation', name: 'Automação RPA', price: 800, icon: 'fa-robot' },
    { id: 'bi', name: 'Business Intelligence', price: 1000, icon: 'fa-chart-pie' }
  ];

  // Computed Estimate
  protected readonly estimate = computed(() => {
    let basePrice = 0;
    const activeOptions = this.serviceOptions.filter(o => this.selectedServices().includes(o.id));
    
    if (activeOptions.length === 0) {
      return { price: 0, time: 'Selecione um serviço' };
    }

    basePrice = activeOptions.reduce((acc, opt) => acc + opt.price, 0);

    // Complexity Multiplier
    let multiplier = 1;
    let daysBase = 24;

    if (this.complexity() === 'small') {
      multiplier = 0.7;
      daysBase = 14;
    } else if (this.complexity() === 'large') {
      multiplier = 1.6;
      daysBase = 60;
    }

    let calculatedPrice = basePrice * multiplier;

    // Urgency Modifiers
    if (this.urgency() === 'fast') {
      calculatedPrice *= 1.25;
      daysBase = Math.round(daysBase * 0.6);
    }

    // Days calculation adjustment per additional service
    const serviceCount = activeOptions.length;
    const finalDays = Math.round(daysBase + (serviceCount - 1) * (daysBase * 0.4));

    // Format currency to BRL
    const formattedPrice = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(calculatedPrice);

    return {
      price: formattedPrice,
      time: `${finalDays} dias úteis`
    };
  });

  protected toggleService(id: string): void {
    const current = this.selectedServices();
    if (current.includes(id)) {
      // Keep at least one selected or let it empty
      this.selectedServices.set(current.filter(item => item !== id));
    } else {
      this.selectedServices.set([...current, id]);
    }
  }

  protected setComplexity(level: string): void {
    this.complexity.set(level);
  }

  protected setUrgency(speed: string): void {
    this.urgency.set(speed);
  }
}
