import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class ContactComponent {
  // Form Signals
  protected readonly name = signal<string>('');
  protected readonly email = signal<string>('');
  protected readonly website = signal<string>('');
  protected readonly service = signal<string>('web');
  protected readonly message = signal<string>('');
  
  // UI Signals
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly submitSuccess = signal<boolean>(false);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    
    // Basic Form validation
    if (!this.name() || !this.email() || !this.message()) {
      return;
    }

    this.isSubmitting.set(true);

    // Simulate API request
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.submitSuccess.set(true);

      // Reset form fields
      this.name.set('');
      this.email.set('');
      this.website.set('');
      this.service.set('web');
      this.message.set('');
    }, 1500);
  }

  protected resetSuccess(): void {
    this.submitSuccess.set(false);
  }
}
