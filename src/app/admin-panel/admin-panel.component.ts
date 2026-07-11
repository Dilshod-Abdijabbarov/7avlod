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

  // Odamlar qidiruvi uchun signallar
  searchFirstName = this.familyService.searchFirstName;
  searchLastName = this.familyService.searchLastName;
  searchMiddleName = this.familyService.searchMiddleName;
  
  totalPages = computed(() => {
    return Math.ceil(this.totalPersons() / this.personsPageSize());
  });

  // Linked pagination signals
  linkedPersons = this.familyService.linkedPersons;
  linkedPageNumber = this.familyService.linkedPageNumber;
  linkedPageSize = this.familyService.linkedPageSize;
  totalLinkedPersons = this.familyService.totalLinkedPersons;
  
  totalLinkedPages = computed(() => {
    return Math.ceil(this.totalLinkedPersons() / this.linkedPageSize());
  });

  // Spouses pagination signals
  spousesPageNumber = this.familyService.spousesPageNumber;
  spousesPageSize = this.familyService.spousesPageSize;
  totalSpouses = this.familyService.totalSpouses;
  
  totalSpousesPages = computed(() => {
    return Math.ceil(this.totalSpouses() / this.spousesPageSize());
  });
  
  selectedPerson: Person | null = null;
  isEditing = false;
  activeTab = signal<'people' | 'marriages' | 'linking' | 'dynasty'>('people');
  currentMarriageChildren = signal<Person[]>([]);
  
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

  // Shaxs qidiruvi (Sulolaga biriktirish uchun - backend orqali)
  dynastyPersonSearchTerm = signal('');
  dynastyPersonsResults = signal<Person[]>([]);

  async onDynastyPersonSearch(term: string) {
    console.log('onDynastyPersonSearch chaqirildi, term:', term);
    this.dynastyPersonSearchTerm.set(term);
    if (term.trim().length >= 2) {
      console.log('Backenddan qidirish boshlandi, term:', term);
      const results = await this.familyService.searchPersons(term);
      console.log('Backenddan olingan qidiruv natijalari:', results);
      this.dynastyPersonsResults.set(results);
    } else {
      this.dynastyPersonsResults.set([]);
    }
  }

  // Er qidiruvi (Nikohlar tabi uchun - backend orqali)
  husbandSearchPersons = signal<Person[]>([]);
  
  async onHusbandSearch(term: string) {
    this.husbandSearchTerm.set(term);
    if (term.trim().length >= 2) {
      const results = await this.familyService.searchPersonsByGender(term, 1);
      this.husbandSearchPersons.set(results);
    } else {
      this.husbandSearchPersons.set([]);
    }
  }

  // Xotin qidiruvi (Nikohlar tabi uchun - backend orqali)
  wifeSearchPersons = signal<Person[]>([]);

  async onWifeSearch(term: string) {
    this.wifeSearchTerm.set(term);
    if (term.trim().length >= 2) {
      const results = await this.familyService.searchPersonsByGender(term, 2);
      this.wifeSearchPersons.set(results);
    } else {
      this.wifeSearchPersons.set([]);
    }
  }

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

  peopleSearchTimeout: any;

  onPeopleSearchChange() {
    this.personsPageNumber.set(0);
    if (this.peopleSearchTimeout) {
      clearTimeout(this.peopleSearchTimeout);
    }
    this.peopleSearchTimeout = setTimeout(() => {
      this.familyService.refreshPersons();
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

  selectHusband(person: Person) {
    const id = person.id!;
    this.newSpouse.husbandId = id;
    this.personNameCache.set(id, `${person.firstName} ${person.lastName}`);
    this.husbandSearchTerm.set('');
    this.husbandSearchPersons.set([]);
  }

  selectWife(person: Person) {
    const id = person.id!;
    this.newSpouse.wifeId = id;
    this.personNameCache.set(id, `${person.firstName} ${person.lastName}`);
    this.wifeSearchTerm.set('');
    this.wifeSearchPersons.set([]);
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
      
      let res;
      if (this.selectedPerson.id) {
        res = await this.familyService.updatePerson(this.selectedPerson);
      } else {
        res = await this.familyService.addPerson(this.selectedPerson);
      }
      
      if (res && (res.result === true || res.statusCode === 200)) {
        this.selectedPerson = null;
        this.isEditing = false;
        this.showNotification('Muvaffaqiyatli saqlandi!');
      } else {
        const errorMsg = res?.error || 'Saqlashda xatolik yuz berdi!';
        this.showNotification(errorMsg, 'error');
      }
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

  async loadMarriageChildren(marriageId: string) {
    if (marriageId) {
      const children = await this.familyService.getChildrenOfMarriage(marriageId);
      this.currentMarriageChildren.set(children);
      this.linkingOrder = children.length + 1;
    } else {
      this.currentMarriageChildren.set([]);
      this.linkingOrder = 1;
    }
  }

  async selectLinkingMarriage(marriage: any) {
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
    await this.loadMarriageChildren(id);
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
        this.childSearchTerm.set('');
        await this.loadMarriageChildren(marriageId);
      }
    } else {
      this.showNotification('Iltimos, farzand va ota-onani tanlang!', 'error');
    }
  }

  async moveChild(index: number, direction: 'up' | 'down') {
    const children = [...this.currentMarriageChildren()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= children.length) return;

    // Swap elements
    const temp = children[index];
    children[index] = children[targetIndex];
    children[targetIndex] = temp;

    // Update orders based on index
    children.forEach((child, idx) => {
      child.order = idx + 1;
    });

    // Optimistically set UI
    this.currentMarriageChildren.set(children);

    const marriageId = this.linkingMarriageId;
    try {
      const child1 = children[index];
      const child2 = children[targetIndex];

      if (child1.id && child2.id) {
        await this.familyService.assignParents({
          spouseId: marriageId,
          personId: child1.id,
          order: child1.order
        });
        await this.familyService.assignParents({
          spouseId: marriageId,
          personId: child2.id,
          order: child2.order
        });
        this.showNotification('Farzandlar tartibi muvaffaqiyatli o\'zgartirildi!');
      }
    } catch (e) {
      console.error('Tartibni saqlashda xato:', e);
      this.showNotification('Xatolik yuz berdi!', 'error');
    }

    await this.loadMarriageChildren(marriageId);
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

  selectDynastyPerson(person: Person) {
    const id = person.id!;
    this.linkingDynastyPersonId = id;
    this.personNameCache.set(id, `${person.firstName} ${person.lastName}`);
    this.dynastyPersonSearchTerm.set('');
    this.dynastyPersonsResults.set([]);
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

  // Tab tanlash va yangilash
  selectTab(tab: 'people' | 'marriages' | 'linking' | 'dynasty') {
    this.activeTab.set(tab);
    if (tab === 'linking') {
      this.linkedPageNumber.set(0);
      this.familyService.refreshLinkedPersons();
      this.linkingMarriageId = '';
      this.currentMarriageChildren.set([]);
      this.linkingOrder = 1;
      this.parentSearchTerm.set('');
      this.childSearchTerm.set('');
      this.linkingChildId = '';
      this.linkingChildName = '';
    } else if (tab === 'people') {
      this.personsPageNumber.set(0);
      this.searchFirstName.set('');
      this.searchLastName.set('');
      this.searchMiddleName.set('');
      this.familyService.refreshPersons();
    } else if (tab === 'marriages') {
      this.spousesPageNumber.set(0);
      this.familyService.refreshSpouses();
      this.husbandSearchTerm.set('');
      this.wifeSearchTerm.set('');
      this.husbandSearchPersons.set([]);
      this.wifeSearchPersons.set([]);
    }
  }

  // Bog'langanlar pagination metodlari
  async goToLinkedPage(page: number) {
    if (page >= 0 && page < this.totalLinkedPages()) {
      this.linkedPageNumber.set(page);
      await this.familyService.refreshLinkedPersons();
    }
  }

  async nextLinkedPage() {
    await this.goToLinkedPage(this.linkedPageNumber() + 1);
  }

  async prevLinkedPage() {
    await this.goToLinkedPage(this.linkedPageNumber() - 1);
  }

  // Nikohlar pagination metodlari
  async goToSpousesPage(page: number) {
    if (page >= 0 && page < this.totalSpousesPages()) {
      this.spousesPageNumber.set(page);
      await this.familyService.refreshSpouses();
    }
  }

  async nextSpousesPage() {
    await this.goToSpousesPage(this.spousesPageNumber() + 1);
  }

  async prevSpousesPage() {
    await this.goToSpousesPage(this.spousesPageNumber() - 1);
  }
}
