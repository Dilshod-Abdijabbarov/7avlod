import { Component, inject, signal, computed } from '@angular/core';
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
  spouses = this.familyService.spouses;
  generations = this.familyService.generations;

  // Pagination signals
  personsPageNumber = this.familyService.personsPageNumber;
  personsPageSize = this.familyService.personsPageSize;
  totalPersons = this.familyService.totalPersons;
  
  totalPages = computed(() => {
    return Math.ceil(this.totalPersons() / this.personsPageSize());
  });
  
  selectedPerson: Person | null = null;
  isEditing = false;
  activeTab = signal<'people' | 'marriages' | 'linking' | 'dynasty'>('people');
  
  parentSearchTerm = signal('');
  childSearchTerm = signal('');
  husbandSearchTerm = signal('');
  wifeSearchTerm = signal('');
  
  // Farzand qidiruvi (Bog'lash tabi uchun)
  filteredPersonsLinking = computed(() => {
    const term = this.childSearchTerm().toLowerCase();
    const allPersons = this.persons();
    if (!term) return allPersons.slice(0, 10);
    return allPersons.filter(p => 
      `${p.firstName} ${p.lastName} ${p.pinfl}`.toLowerCase().includes(term)
    );
  });

  // Shaxs qidiruvi (Sulolaga biriktirish uchun)
  dynastyPersonSearchTerm = signal('');
  filteredPersonsDynasty = computed(() => {
    const term = this.dynastyPersonSearchTerm().toLowerCase();
    const allPersons = this.persons();
    if (!term) return allPersons.slice(0, 10);
    return allPersons.filter(p => 
      `${p.firstName} ${p.lastName} ${p.pinfl}`.toLowerCase().includes(term)
    );
  });

  // Er qidiruvi (Nikohlar tabi uchun)
  filteredHusbands = computed(() => {
    const term = this.husbandSearchTerm().toLowerCase();
    const allPersons = this.persons().filter(p => p.gender === 1);
    if (!term) return allPersons.slice(0, 10);
    return allPersons.filter(p => 
      `${p.firstName} ${p.lastName} ${p.pinfl}`.toLowerCase().includes(term)
    );
  });

  // Xotin qidiruvi (Nikohlar tabi uchun)
  filteredWives = computed(() => {
    const term = this.wifeSearchTerm().toLowerCase();
    const allPersons = this.persons().filter(p => p.gender === 2);
    if (!term) return allPersons.slice(0, 10);
    return allPersons.filter(p => 
      `${p.firstName} ${p.lastName} ${p.pinfl}`.toLowerCase().includes(term)
    );
  });

  // Ota-ona (Nikoh) qidiruvi
  filteredMarriages = computed(() => {
    const term = this.parentSearchTerm().toLowerCase();
    const allSpouses = this.spouses();
    const allPersons = this.persons();
    
    const marriagesWithNames = allSpouses.map(s => {
      const husband = allPersons.find(p => p.id === s.husbandId);
      const wife = allPersons.find(p => p.id === s.wifeId);
      return {
        ...s,
        id: s.id,
        displayName: s.husbandName && s.wifeName 
          ? `${s.husbandName} & ${s.wifeName}`
          : `${husband?.firstName || '?'} ${husband?.lastName || ''} & ${wife?.firstName || '?'} ${wife?.lastName || ''}`,
        husband,
        wife
      };
    });

    console.log('Qidiruv uchun tayyorlangan nikohlar:', marriagesWithNames);

    if (!term) return marriagesWithNames.slice(0, 10);
    
    return marriagesWithNames.filter(m => 
      m.displayName.toLowerCase().includes(term)
    );
  });

  private searchTimeout: any;

  onParentSearchChange(term: string) {
    this.parentSearchTerm.set(term);
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.familyService.refreshSpouses(term);
    }, 300);
  }

  onChildSearchChange(term: string) {
    this.childSearchTerm.set(term);
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.familyService.refreshPersons(term);
    }, 300);
  }

  // Yangi nikoh uchun state
  newSpouse = {
    husbandId: '',
    wifeId: '',
    order: 1
  };

  selectHusband(id: string) {
    this.newSpouse.husbandId = id;
    this.husbandSearchTerm.set('');
  }

  selectWife(id: string) {
    this.newSpouse.wifeId = id;
    this.wifeSearchTerm.set('');
  }

  async saveSpouse() {
    if (this.newSpouse.husbandId && this.newSpouse.wifeId) {
      const res = await this.familyService.addSpouse(this.newSpouse);
      if (res) {
        this.showNotification('Nikoh muvaffaqiyatli saqlandi!');
        this.newSpouse = { husbandId: '', wifeId: '', order: 1 };
        this.husbandSearchTerm.set('');
        this.wifeSearchTerm.set('');
      }
    } else {
      this.showNotification('Iltimos, er va xotinni tanlang!', 'error');
    }
  }

  async deleteSpouse(id: string | undefined) {
    if (!id) return;
    if (confirm('Rostdan ham ushbu nikohni o\'chirmoqchimisiz?')) {
      await this.familyService.deleteSpouse(id);
    }
  }

  editPerson(person: Person) {
    this.selectedPerson = { ...person };
    if (!this.selectedPerson.generationId) {
      this.selectedPerson.generationId = '';
    }
    this.parentSearchTerm.set('');
    
    // Sanalarni input[type="date"] uchun formatlaymiz (YYYY-MM-DD)
    if (this.selectedPerson.birthDate) {
      this.selectedPerson.birthDate = this.selectedPerson.birthDate.split('T')[0];
    }
    if (this.selectedPerson.deathDate) {
      this.selectedPerson.deathDate = this.selectedPerson.deathDate.split('T')[0];
    }
    
    this.isEditing = true;
  }

  addNewPerson() {
    this.selectedPerson = {
      id: '',
      firstName: '',
      lastName: '',
      middleName: '',
      gender: 1,
      order: 1,
      generationLevel: 1,
      isAlive: true,
      pinfl: '',
      phoneNumber: '',
      birthDate: '',
      deathDate: '',
      birthPlace: '',
      biography: '',
      telegramLink: '',
      instagramLink: '',
      description: '',
      parentSpouseId: '',
      generationId: ''
    };
    this.isEditing = true;
    this.parentSearchTerm.set('');
  }

  cancelEdit() {
    this.selectedPerson = null;
    this.isEditing = false;
  }

  async savePerson() {
    if (this.selectedPerson) {
      // Ensure name is populated if still used in some parts of the UI
      this.selectedPerson.name = `${this.selectedPerson.firstName} ${this.selectedPerson.lastName}`.trim();
      
      if (this.selectedPerson.id) {
        await this.familyService.updatePerson(this.selectedPerson);
      } else {
        await this.familyService.addPerson(this.selectedPerson);
      }
      this.selectedPerson = null;
      this.isEditing = false;
    }
  }

  async deletePerson(id: string | undefined) {
    if (!id) return;
    if (confirm('Rostdan ham ushbu foydalanuvchini o\'chirmoqchimisiz?')) {
      await this.familyService.deletePerson(id);
    }
  }

  getParentName(parentSpouseId?: string): string {
    if (!parentSpouseId || parentSpouseId === 'undefined') return '-';
    
    // Avval signaldan qidiramiz
    const spouse = this.spouses().find(s => s.id === parentSpouseId);
    if (!spouse) {
      console.warn('Tanlangan nikoh topilmadi:', parentSpouseId);
      return '-';
    }
    
    if (spouse.husbandName && spouse.wifeName) {
      return `${spouse.husbandName} & ${spouse.wifeName}`;
    }
    
    const husband = this.persons().find(p => p.id === spouse.husbandId);
    const wife = this.persons().find(p => p.id === spouse.wifeId);
    return `${husband?.firstName || '?'} ${husband?.lastName || ''} & ${wife?.firstName || '?'} ${wife?.lastName || ''}`;
  }

  private personNameCache = new Map<string, string>();

  getPersonName(id?: string): string {
    if (!id || id === 'undefined') return '-';
    if (this.personNameCache.has(id)) {
      return this.personNameCache.get(id)!;
    }
    const p = this.persons().find(person => person.id === id);
    if (p) {
      const name = `${p.firstName} ${p.lastName}`;
      this.personNameCache.set(id, name);
      return name;
    }
    if (id === this.linkingChildId && this.linkingChildName) {
      return this.linkingChildName;
    }
    return '-';
  }

  selectLinkingChild(personOrId: any) {
    console.log('Farzand tanlandi:', personOrId);
    if (typeof personOrId === 'string') {
      this.linkingChildId = personOrId;
      const p = this.persons().find(person => person.id === personOrId);
      this.linkingChildName = p ? `${p.firstName} ${p.lastName}` : 'Tanlangan farzand';
    } else if (personOrId) {
      const id = personOrId.id || personOrId.Id;
      const firstName = personOrId.firstName || personOrId.FirstName || '';
      const lastName = personOrId.lastName || personOrId.LastName || '';
      this.linkingChildId = id || '';
      this.linkingChildName = `${firstName} ${lastName}`.trim() || 'Tanlangan farzand';
    }
    this.childSearchTerm.set('');
    this.familyService.refreshPersons('');
  }

  selectLinkingMarriage(marriage: any) {
    const id = marriage.id || marriage.Id;
    console.log('Nikoh tanlashga harakat:', marriage);
    if (!id) {
      console.error('DIQQAT: Tanlangan nikohda ID yo\'q!', marriage);
      alert('Xatolik: Nikoh IDsi topilmadi. Konsolni tekshiring.');
      return;
    }
    console.log('Nikoh tanlandi:', id);
    this.linkingMarriageId = id;
    this.parentSearchTerm.set('');
  }

  selectParent(spouseId: string) {
    if (this.selectedPerson) {
      this.selectedPerson.parentSpouseId = spouseId;
      this.parentSearchTerm.set('');
    }
  }

  clearParent() {
    if (this.selectedPerson) {
      this.selectedPerson.parentSpouseId = '';
    }
  }

  // BOG'LASH TABI UCHUN METODLAR
  linkingChildId = '';
  linkingChildName = '';
  linkingMarriageId = '';
  linkingOrder = 1;

  // Xabarnoma tizimi
  notification = signal<{ message: string, type: 'success' | 'error' } | null>(null);

  showNotification(message: string, type: 'success' | 'error' = 'success') {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 3000);
  }

  async saveLink() {
    const childId = this.linkingChildId;
    const marriageId = this.linkingMarriageId;
    const order = this.linkingOrder;
    
    if (childId && marriageId && childId !== 'undefined' && marriageId !== 'undefined') {
      const res = await this.familyService.assignParents({
        personId: childId,
        spouseId: marriageId,
        order: order
      });

      if (res) {
        this.showNotification('Muvaffaqiyatli bog\'landi!');
        this.linkingChildId = '';
        this.linkingChildName = '';
        this.linkingMarriageId = '';
        this.linkingOrder = 1;
        this.childSearchTerm.set('');
        this.parentSearchTerm.set('');
      }
    } else {
      this.showNotification('Iltimos, farzand va ota-onani tanlang!', 'error');
    }
  }

  // SULOLA TABI UCHUN METODLAR VA STATE
  linkingDynastyPersonId = '';
  linkingDynastyId = '';
  isEditingDynasty = false;
  selectedDynasty: any = null;
  
  getDefaultExpireDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().split('T')[0];
  }

  newGeneration = {
    name: '',
    description: '',
    expireDate: this.getDefaultExpireDate()
  };

  selectDynastyPerson(id: string) {
    this.linkingDynastyPersonId = id;
    this.dynastyPersonSearchTerm.set('');
  }

  getDynastyName(generationId?: string): string {
    if (!generationId || generationId === 'undefined') return '-';
    const gen = this.generations().find(g => g.id === generationId);
    return gen ? gen.name : '-';
  }

  editDynasty(gen: any) {
    this.selectedDynasty = { ...gen };
    this.newGeneration = {
      name: gen.name,
      description: gen.description,
      expireDate: gen.expireDate ? gen.expireDate.split('T')[0] : this.getDefaultExpireDate()
    };
    this.isEditingDynasty = true;
  }

  cancelDynastyEdit() {
    this.selectedDynasty = null;
    this.isEditingDynasty = false;
    this.newGeneration = {
      name: '',
      description: '',
      expireDate: this.getDefaultExpireDate()
    };
  }

  async saveGeneration() {
    if (this.newGeneration.name && this.newGeneration.description) {
      let expDate = new Date(this.newGeneration.expireDate);
      if (isNaN(expDate.getTime())) {
        expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 5);
      }
      
      const body = {
        Id: this.isEditingDynasty ? this.selectedDynasty.id : undefined,
        Name: this.newGeneration.name,
        Description: this.newGeneration.description,
        ExpireDate: expDate.toISOString()
      };
      
      let res;
      if (this.isEditingDynasty) {
        res = await this.familyService.updateGeneration(body);
      } else {
        res = await this.familyService.addGeneration(body);
      }

      if (res) {
        this.showNotification(this.isEditingDynasty ? 'Sulola muvaffaqiyatli yangilandi!' : 'Sulola muvaffaqiyatli yaratildi!');
        this.cancelDynastyEdit();
      }
    } else {
      this.showNotification('Iltimos, sulola nomi va tavsifini kiriting!', 'error');
    }
  }

  async deleteDynasty(id: string) {
    if (!id) return;
    if (confirm('Rostdan ham ushbu sulolani o\'chirmoqchimisiz? Sulolaga biriktirilgan shaxslar bog\'liqligi bekor qilinadi.')) {
      const res = await this.familyService.deleteGeneration(id);
      if (res) {
        this.showNotification('Sulola muvaffaqiyatli o\'chirildi!');
      }
    }
  }

  async saveDynastyLink() {
    const personId = this.linkingDynastyPersonId;
    const dynastyId = this.linkingDynastyId;
    
    if (personId && dynastyId && personId !== 'undefined' && dynastyId !== 'undefined') {
      const res = await this.familyService.assignGeneration(personId, dynastyId);
      if (res) {
        this.showNotification('Shaxs sulolaga muvaffaqiyatli biriktirildi!');
        this.linkingDynastyPersonId = '';
        this.linkingDynastyId = '';
        this.dynastyPersonSearchTerm.set('');
      }
    } else {
      this.showNotification('Iltimos, shaxs va sulolani tanlang!', 'error');
    }
  }

  // Odamlar pagination metodlari
  async goToPersonsPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.personsPageNumber.set(page);
      await this.familyService.refreshPersons();
    }
  }

  async nextPage() {
    await this.goToPersonsPage(this.personsPageNumber() + 1);
  }

  async prevPage() {
    await this.goToPersonsPage(this.personsPageNumber() - 1);
  }
}
