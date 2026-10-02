import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-methodology',
  imports: [],
  templateUrl: './methodology.html',
  styleUrl: './methodology.css'
})
export class MethodologyComponent implements OnInit {
  protected readonly activeTab = signal<string>('dev'); // 'dev', 'automation', 'bi'
  private readonly route = inject(ActivatedRoute);

  public ngOnInit(): void {
    // Listen to URL fragments (e.g., #dev, #automacao, #bi) to auto-select the tab
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        if (fragment === 'dev') {
          this.activeTab.set('dev');
        } else if (fragment === 'automacao') {
          this.activeTab.set('automation');
        } else if (fragment === 'bi') {
          this.activeTab.set('bi');
        }
      }
    });
  }

  protected selectTab(tab: string): void {
    this.activeTab.set(tab);
  }
}
