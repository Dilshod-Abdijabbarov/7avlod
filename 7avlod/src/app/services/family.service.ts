import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Person {
  id: string;
  name: string;
  role?: string;
  imageUrl?: string;
  birthDate?: string;
  location?: string;
  bio?: string;
  parentId?: string; // Qaysi foydalanuvchining farzandi ekanligini bildiradi
  spouseId?: string; // Turmush o'rtog'i (buvi/kelin/kuyov)
}

export interface FamilyNode {
  parents: Person[]; 
  children?: FamilyNode[];
}

@Injectable({
  providedIn: 'root'
})
export class FamilyService {
  // Boshlang'ich mock ma'lumotlar (Flat list)
  private persons: Person[] = [
    { id: '1', name: 'Toshmat Bobo', role: 'Bobo (1-avlod)', imageUrl: 'https://i.pravatar.cc/150?img=11', birthDate: '1920-05-14', location: 'Samarqand', bio: 'Toshmat Bobo juda mehnatkash inson bo`lgan.', spouseId: '2' },
    { id: '2', name: 'Xolbibi Buvi', role: 'Buvi (1-avlod)', imageUrl: 'https://i.pravatar.cc/150?img=10', birthDate: '1925-08-22', location: 'Buxoro', bio: 'Ajoyib pazanda va mehribon ona.', spouseId: '1' },
    { id: '3', name: 'Qodir (Ota)', role: '2-avlod', imageUrl: 'https://i.pravatar.cc/150?img=12', parentId: '1', spouseId: '4' },
    { id: '4', name: 'Zuhra (Ona)', role: 'Kelioyi', imageUrl: 'https://i.pravatar.cc/150?img=5', spouseId: '3' },
    { id: '5', name: 'Jasur', role: '3-avlod (Nevara)', imageUrl: 'https://i.pravatar.cc/150?img=13', parentId: '3', spouseId: '6' },
    { id: '6', name: 'Nigora', role: 'Kelin', imageUrl: 'https://i.pravatar.cc/150?img=9', spouseId: '5' },
    { id: '7', name: 'Aziz', role: '4-avlod (Chevara)', imageUrl: 'https://i.pravatar.cc/150?img=14', parentId: '5' },
    { id: '8', name: 'Umid', role: '5-avlod (Evara)', imageUrl: 'https://i.pravatar.cc/150?img=15', parentId: '7' },
    { id: '11', name: 'Malika', role: '4-avlod (Chevara)', imageUrl: 'https://i.pravatar.cc/150?img=1', parentId: '5' },
    { id: '12', name: 'Sanjar', role: '3-avlod (Nevara)', imageUrl: 'https://i.pravatar.cc/150?img=3', parentId: '3' },
    { id: '13', name: 'Xolida (Amma)', role: '2-avlod', imageUrl: 'https://i.pravatar.cc/150?img=2', parentId: '1', spouseId: '14' },
    { id: '14', name: 'Botir (Pochcha)', role: 'Kuyov', imageUrl: 'https://i.pravatar.cc/150?img=4', spouseId: '13' },
    { id: '15', name: 'Maftuna', role: '3-avlod (Nevara)', imageUrl: 'https://i.pravatar.cc/150?img=6', parentId: '13' }
  ];

  private personsSubject = new BehaviorSubject<Person[]>(this.persons);
  public persons$ = this.personsSubject.asObservable();

  constructor() {}

  // Barcha foydalanuvchilarni olish
  getAllPersons(): Person[] {
    return this.personsSubject.getValue();
  }

  // Daraxt strukturasini yig'ish (Yassi ro'yxatdan daraxtga o'tkazish)
  getTreeData(): FamilyNode | null {
    const allPersons = this.getAllPersons();
    
    // Eng asosiy odamni (parentId yo'q, lekin farzandi bor) topish. Odatda Bobo (id: 1)
    const rootPerson = allPersons.find(p => !p.parentId && p.spouseId);
    if (!rootPerson) return null;

    return this.buildNode(rootPerson, allPersons);
  }

  private buildNode(mainPerson: Person, allPersons: Person[]): FamilyNode {
    const parents = [mainPerson];
    if (mainPerson.spouseId) {
      const spouse = allPersons.find(p => p.id === mainPerson.spouseId);
      if (spouse) parents.push(spouse);
    }

    // mainPerson yoki uning turmush o'rtog'i orqali parentId si bog'langan bolalarni topish
    const childrenPersons = allPersons.filter(p => 
      p.parentId === mainPerson.id || (mainPerson.spouseId && p.parentId === mainPerson.spouseId)
    );

    const childrenNodes: FamilyNode[] = childrenPersons.map(child => this.buildNode(child, allPersons));

    return {
      parents,
      children: childrenNodes.length > 0 ? childrenNodes : undefined
    };
  }

  addPerson(person: Person) {
    const current = this.personsSubject.getValue();
    person.id = Math.random().toString(36).substring(2, 9); // mock ID generator
    
    // Agar juftlik bo'lsa, ikkinchisiga ham spouseId ni yozish
    if (person.spouseId) {
      const spouse = current.find(p => p.id === person.spouseId);
      if (spouse) spouse.spouseId = person.id;
    }

    this.personsSubject.next([...current, person]);
  }

  updatePerson(updatedPerson: Person) {
    const current = this.personsSubject.getValue();
    const index = current.findIndex(p => p.id === updatedPerson.id);
    if (index !== -1) {
      current[index] = { ...updatedPerson };
      this.personsSubject.next([...current]);
    }
  }

  deletePerson(id: string) {
    const current = this.personsSubject.getValue();
    const filtered = current.filter(p => p.id !== id);
    this.personsSubject.next(filtered);
  }
}
