import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Person {
  id: string;
  name: string;
  role?: string;
  imageUrl?: string;
  birthDate?: string;
  location?: string;
  bio?: string;
  parentId?: string;
  spouseId?: string;
}

export interface FamilyNode {
  parents: Person[]; 
  children?: FamilyNode[];
}

@Injectable({
  providedIn: 'root'
})
export class FamilyService {
  private http = inject(HttpClient);
  // ASP.NET Web API manzili (O'zingiznikiga moslashtiring)
  private apiUrl = 'https://localhost:7245/api/persons'; 

  // State boshqarish uchun signallar
  private personsSignal = signal<Person[]>([]);
  public persons = computed(() => this.personsSignal());

  constructor() {
    this.refreshPersons();
  }

  // API'dan ma'lumotlarni qayta yuklash
  async refreshPersons() {
    try {
      const data = await firstValueFrom(this.http.get<Person[]>(this.apiUrl));
      this.personsSignal.set(data);
    } catch (error) {
      console.error('API-dan ma\'lumot olishda xato:', error);
    }
  }

  // Daraxt strukturasini hisoblash
  getTreeData(): FamilyNode | null {
    const allPersons = this.persons();
    if (allPersons.length === 0) return null;

    // Eng asosiy odamni topish (parentId yo'q odam)
    const rootPerson = allPersons.find(p => !p.parentId && p.spouseId) || allPersons[0];
    return this.buildNode(rootPerson, allPersons);
  }

  private buildNode(mainPerson: Person, allPersons: Person[]): FamilyNode {
    const parents = [mainPerson];
    if (mainPerson.spouseId) {
      const spouse = allPersons.find(p => p.id === mainPerson.spouseId);
      if (spouse) parents.push(spouse);
    }

    const childrenPersons = allPersons.filter(p => 
      p.parentId === mainPerson.id || (mainPerson.spouseId && p.parentId === mainPerson.spouseId)
    );

    const childrenNodes: FamilyNode[] = childrenPersons.map(child => this.buildNode(child, allPersons));

    return {
      parents,
      children: childrenNodes.length > 0 ? childrenNodes : undefined
    };
  }

  async addPerson(person: Person) {
    const res = await firstValueFrom(this.http.post<Person>(this.apiUrl, person));
    await this.refreshPersons();
    return res;
  }

  async updatePerson(person: Person) {
    const res = await firstValueFrom(this.http.put<Person>(`${this.apiUrl}/${person.id}`, person));
    await this.refreshPersons();
    return res;
  }

  async deletePerson(id: string) {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
    await this.refreshPersons();
  }
}
