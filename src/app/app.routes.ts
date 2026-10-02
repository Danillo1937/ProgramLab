import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { MethodologyComponent } from './pages/methodology/methodology';
import { ContactComponent } from './pages/contact/contact';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'metodologia', component: MethodologyComponent },
  { path: 'contato', component: ContactComponent },
  { path: '**', redirectTo: 'home' }
];
