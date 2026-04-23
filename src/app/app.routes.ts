import { Routes } from '@angular/router';
import { FamilyTreeComponent } from './family-tree/family-tree.component';

export const routes: Routes = [
  { path: '', component: FamilyTreeComponent },
  { path: 'admin', loadComponent: () => import('./admin-panel/admin-panel.component').then(m => m.AdminPanelComponent) }
];
