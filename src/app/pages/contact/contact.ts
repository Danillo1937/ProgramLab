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
  protected readonly phone = signal<string>('');
  protected readonly email = signal<string>('');
  protected readonly website = signal<string>('');
  protected readonly service = signal<string>('web');
  protected readonly message = signal<string>('');
  
  // UI Signals
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly submitSuccess = signal<boolean>(false);

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const form = event.target as HTMLFormElement | null;

    // Basic Form validation
    if (!form || !this.name() || !this.email() || !this.message()) {
      return;
    }

    this.isSubmitting.set(true);

    const formData = new FormData(form);

    fetch(form.action, {
      method: form.method || 'POST',
      body: formData
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Falha ao enviar o formulário');
        }

        return response.json().catch(() => ({}));
      })
      .then(() => {
        this.submitSuccess.set(true);

        // Reset form fields
        this.name.set('');
        this.phone.set('');
        this.email.set('');
        this.website.set('');
        this.service.set('web');
        this.message.set('');
      })
      .catch(() => {
        this.submitSuccess.set(false);
      })
      .finally(() => {
        this.isSubmitting.set(false);
      });
  }

  protected resetSuccess(): void {
    this.submitSuccess.set(false);
  }
}
