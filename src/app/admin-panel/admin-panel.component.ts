import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FamilyService, Person } from '../services/family.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  persons: Person[] = [];
  selectedPerson: Person | null = null;
  isEditing: boolean = false;
  private sub: Subscription = new Subscription();

  constructor(private familyService: FamilyService) {}

  ngOnInit() {
    this.sub.add(
      this.familyService.persons$.subscribe(data => {
        this.persons = data;
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

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

  savePerson() {
    if (this.selectedPerson) {
      if (this.selectedPerson.id) {
        this.familyService.updatePerson(this.selectedPerson);
      } else {
        this.familyService.addPerson(this.selectedPerson);
      }
      this.selectedPerson = null;
      this.isEditing = false;
    }
  }

  getParentName(parentId?: string): string {
    if (!parentId) return '-';
    const parent = this.persons.find(p => p.id === parentId);
    return parent ? parent.name : '-';
  }
}
