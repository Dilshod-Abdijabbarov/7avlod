import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FamilyService, FamilyNode, Person } from '../services/family.service';

@Component({
  selector: 'app-family-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './family-tree.component.html',
  styleUrls: ['./family-tree.component.css']
})
export class FamilyTreeComponent {
  private familyService = inject(FamilyService);
  
  // Daraxt ma'lumotlarini signal orqali avtomatik yangilanishini ta'minlaymiz
  treeData = computed(() => this.familyService.getTreeData());
  
  selectedPerson: Person | null = null;

  selectPerson(person: Person) {
    this.selectedPerson = person;
  }

  closeModal() {
    this.selectedPerson = null;
  }
}
