import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FamilyService, Person } from '../services/family.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent {
  private familyService = inject(FamilyService);
  
  // Signallarni to'g'ridan-to'g'ri bog'laymiz
  persons = this.familyService.persons;
  
  selectedPerson: Person | null = null;
  isEditing = false;

  editPerson(person: Person) {
    this.selectedPerson = { ...person };
    this.isEditing = true;
  }

  addNewPerson() {
    this.selectedPerson = {
      id: '',
      name: '',
      role: '',
      imageUrl: '',
      birthDate: '',
      location: '',
      bio: '',
      parentId: ''
    };
    this.isEditing = true;
  }

  cancelEdit() {
    this.selectedPerson = null;
    this.isEditing = false;
  }

  async savePerson() {
    if (this.selectedPerson) {
      if (this.selectedPerson.id) {
        await this.familyService.updatePerson(this.selectedPerson);
      } else {
        await this.familyService.addPerson(this.selectedPerson);
      }
      this.selectedPerson = null;
      this.isEditing = false;
    }
  }

  async deletePerson(id: string) {
    if (confirm('Rostdan ham ushbu foydalanuvchini o\'chirmoqchimisiz?')) {
      await this.familyService.deletePerson(id);
    }
  }

  getParentName(parentId?: string): string {
    if (!parentId) return '-';
    const parent = this.persons().find(p => p.id === parentId);
    return parent ? parent.name : '-';
  }
}
