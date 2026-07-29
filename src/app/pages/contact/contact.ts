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
  protected readonly submitError = signal<string>('');

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    // Basic form validation
    if (!this.name() || !this.email() || !this.message()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');

    try {
      const payload = {
        name: this.name(),
        email: this.email(),
        website: this.website(),
        service: this.service(),
        message: this.message(),
      };

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Falha ao enviar a mensagem. Tente novamente mais tarde.');
      }

      this.submitSuccess.set(true);

      // Reset form fields
      this.name.set('');
      this.email.set('');
      this.website.set('');
      this.service.set('web');
      this.message.set('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar a mensagem. Tente novamente mais tarde.';
      this.submitError.set(message);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected resetSuccess(): void {
    this.submitSuccess.set(false);
    this.submitError.set('');
  }
}
