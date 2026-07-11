import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Person {
  id?: string;
  parentSpouseId?: string;
  pinfl?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  gender: number;
  order: number;
  generationLevel: number;
  photoUrl?: string;
  phoneNumber?: string;
  isAlive: boolean;
  deathDate?: string;
  birthPlace?: string;
  biography?: string;
  telegramLink?: string;
  instagramLink?: string;
  createdBy?: string;
  description?: string;
  generationId?: string;

  // Legacy compatibility / virtual fields
  name?: string;
  role?: string;
  imageUrl?: string;
  location?: string;
  bio?: string;
  parentId?: string;
  spouseId?: string;
}

export interface Spouse {
  id?: string;
  husbandId?: string;
  wifeId?: string;
  husbandName?: string;
  wifeName?: string;
  order: number;
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
  private apiUrl = 'http://localhost:7133/api/Person';

  // State boshqarish uchun signallar
  private personsSignal = signal<Person[]>([]);
  public persons = computed(() => this.personsSignal());

  private linkedPersonsSignal = signal<Person[]>([]);
  public linkedPersons = computed(() => this.linkedPersonsSignal());

  private spousesSignal = signal<Spouse[]>([]);
  public spouses = computed(() => this.spousesSignal());

  private generationsSignal = signal<any[]>([]);
  public generations = computed(() => this.generationsSignal());

  // Pagination signallari
  public personsPageNumber = signal<number>(0);
  public personsPageSize = signal<number>(10);
  private totalPersonsSignal = signal<number>(0);
  public totalPersons = computed(() => this.totalPersonsSignal());

  // Odamlar uchun qidiruv signallari
  public searchFirstName = signal<string>('');
  public searchLastName = signal<string>('');
  public searchMiddleName = signal<string>('');

  // Bog'langanlar uchun pagination signallari
  public linkedPageNumber = signal<number>(0);
  public linkedPageSize = signal<number>(10);
  private totalLinkedPersonsSignal = signal<number>(0);
  public totalLinkedPersons = computed(() => this.totalLinkedPersonsSignal());

  // Nikohlar (Spouses) uchun pagination signallari
  public spousesPageNumber = signal<number>(0);
  public spousesPageSize = signal<number>(5);
  private totalSpousesSignal = signal<number>(0);
  public totalSpouses = computed(() => this.totalSpousesSignal());

  constructor() {
    this.refreshPersons();
    this.refreshSpouses();
    this.refreshGenerations();
    this.refreshLinkedPersons();
  }

  async refreshPersons(filters?: string | Record<string, string>) {
    try {
      const pageNumber = this.personsPageNumber();
      const pageSize = this.personsPageSize();

      let activeFilters: Record<string, string> = {};
      let isSingleSearch = false;
      
      if (typeof filters === 'string') {
        if (filters.trim()) {
          activeFilters = { FirstName: filters.trim() };
          isSingleSearch = true;
        }
      } else if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val && val.trim()) {
            activeFilters[key] = val.trim();
          }
        });
      } else {
        // Avtomatik ravishda service signallaridagi qidiruv shartlarini olamiz
        const fn = this.searchFirstName();
        const ln = this.searchLastName();
        const mn = this.searchMiddleName();
        if (fn) activeFilters['FirstName'] = fn;
        if (ln) activeFilters['LastName'] = ln;
        if (mn) activeFilters['MiddleName'] = mn;
      }

      const data = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/GetAllPersons`, {
        PageNumber: pageNumber,
        PageSize: isSingleSearch ? 100 : pageSize,
        Filters: activeFilters
      }));

      let personsArray: any[] = [];
      let totalItems = 0;

      if (data) {
        if (Array.isArray(data)) {
          personsArray = data;
          totalItems = data.length;
        } else if (typeof data === 'object') {
          // Foydalanuvchi taqdim etgan struktura: data.result.items
          if (data.result && Array.isArray(data.result.items)) {
            personsArray = data.result.items;
            totalItems = data.result.totalItems || data.result.TotalItems || data.result.items.length;
          } else {
            // Boshqa mumkin bo'lgan formatlar uchun fallback
            const possibleArray = data.$values || data.data || data.items || data.result;
            if (Array.isArray(possibleArray)) {
              personsArray = possibleArray;
              totalItems = possibleArray.length;
            }
          }
        }
      }

      // Ma'lumotlarni normalizatsiya qilish (id vs Id)
      const normalizedPersons = personsArray.map(p => ({
        ...p,
        id: p.id || p.Id,
        parentSpouseId: p.parentSpouseId || p.ParentSpouseId
      }));

      this.personsSignal.set(normalizedPersons);
      this.totalPersonsSignal.set(totalItems);
    } catch (error) {
      console.error('API-dan ma\'lumot olishda xato:', error);
      this.personsSignal.set([]); // Xatolik holatida bo'sh array
      this.totalPersonsSignal.set(0);
    }
  }

  async refreshLinkedPersons() {
    try {
      const pageNumber = this.linkedPageNumber();
      const pageSize = this.linkedPageSize();

      const data = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/GetAllPersons`, {
        PageNumber: pageNumber,
        PageSize: pageSize,
        Filters: { hasParentSpouse: "true" }
      }));

      let personsArray: any[] = [];
      let totalItems = 0;

      if (data) {
        if (Array.isArray(data)) {
          personsArray = data;
          totalItems = data.length;
        } else if (typeof data === 'object') {
          if (data.result && Array.isArray(data.result.items)) {
            personsArray = data.result.items;
            totalItems = data.result.totalItems || data.result.TotalItems || data.result.items.length;
          } else {
            const possibleArray = data.$values || data.data || data.items || data.result;
            if (Array.isArray(possibleArray)) {
              personsArray = possibleArray;
              totalItems = possibleArray.length;
            }
          }
        }
      }

      const normalizedPersons = personsArray.map(p => ({
        ...p,
        id: p.id || p.Id,
        parentSpouseId: p.parentSpouseId || p.ParentSpouseId
      }));

      this.linkedPersonsSignal.set(normalizedPersons);
      this.totalLinkedPersonsSignal.set(totalItems);
    } catch (error) {
      console.error("API-dan bog'langanlarni olishda xato:", error);
      this.linkedPersonsSignal.set([]);
      this.totalLinkedPersonsSignal.set(0);
    }
  }

  async getChildrenOfMarriage(marriageId: string): Promise<Person[]> {
    try {
      const data = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/GetAllPersons`, {
        PageNumber: 0,
        PageSize: 100,
        Filters: { ParentSpouseId: marriageId }
      }));

      let personsArray: any[] = [];
      if (data) {
        if (Array.isArray(data)) {
          personsArray = data;
        } else if (data.result && Array.isArray(data.result.items)) {
          personsArray = data.result.items;
        } else {
          const possibleArray = data.$values || data.data || data.items || data.result;
          if (Array.isArray(possibleArray)) {
            personsArray = possibleArray;
          }
        }
      }

      return personsArray.map(p => ({
        ...p,
        id: p.id || p.Id,
        parentSpouseId: p.parentSpouseId || p.ParentSpouseId
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error("API-dan bolalarni olishda xato:", error);
      return [];
    }
  }

  async searchPersons(term: string): Promise<Person[]> {
    console.log('FamilyService.searchPersons chaqirildi, term:', term);
    if (!term || term.trim().length < 2) return [];
    try {
      const payload = {
        PageNumber: 0,
        PageSize: 20,
        Filters: { FirstName: term }
      };
      console.log('GetAllPersons API ga yuborilayotgan payload:', payload);
      const data = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/GetAllPersons`, payload));
      console.log('GetAllPersons API dan kelgan javob:', data);

      let personsArray: any[] = [];
      if (data) {
        if (Array.isArray(data)) {
          personsArray = data;
        } else if (data.result && Array.isArray(data.result.items)) {
          personsArray = data.result.items;
        } else {
          const possibleArray = data.$values || data.data || data.items || data.result;
          if (Array.isArray(possibleArray)) {
            personsArray = possibleArray;
          }
        }
      }

      return personsArray.map(p => ({
        ...p,
        id: p.id || p.Id,
        parentSpouseId: p.parentSpouseId || p.ParentSpouseId
      }));
    } catch (error) {
      console.error("Search persons API xatoligi:", error);
      return [];
    }
  }

  async searchPersonsByGender(term: string, gender: number): Promise<Person[]> {
    if (!term || term.trim().length < 2) return [];
    try {
      const payload = {
        PageNumber: 0,
        PageSize: 20,
        Filters: { FirstName: term, Gender: gender.toString() }
      };
      const data = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/GetAllPersons`, payload));

      let personsArray: any[] = [];
      if (data) {
        if (Array.isArray(data)) {
          personsArray = data;
        } else if (data.result && Array.isArray(data.result.items)) {
          personsArray = data.result.items;
        } else {
          const possibleArray = data.$values || data.data || data.items || data.result;
          if (Array.isArray(possibleArray)) {
            personsArray = possibleArray;
          }
        }
      }

      return personsArray.map(p => ({
        ...p,
        id: p.id || p.Id,
        parentSpouseId: p.parentSpouseId || p.ParentSpouseId
      }));
    } catch (error) {
      console.error(`Search persons by gender ${gender} API xatoligi:`, error);
      return [];
    }
  }

  // Daraxt strukturasini hisoblash
  getTreeData(): FamilyNode | null {
    const allPersons = this.persons();
    const allSpouses = this.spouses();
    if (!Array.isArray(allPersons) || allPersons.length === 0) return null;

    // Eng asosiy odamni topish (parentSpouseId yo'q bo'lgan va erkak kishi - odatda shajara boshlovchisi)
    const rootPerson = allPersons.find(p => !p.parentSpouseId && p.gender === 1) || allPersons[0];
    
    // Shu odam ishtirokidagi birinchi nikohni topish
    const rootSpouse = allSpouses.find(s => s.husbandId === rootPerson.id || s.wifeId === rootPerson.id);

    if (!rootSpouse) {
      // Agar nikohi bo'lmasa, faqat shu odamning o'zini chiqaramiz
      return {
        parents: [rootPerson],
        children: this.getChildNodesForPerson(rootPerson, allPersons, allSpouses)
      };
    }

    return this.buildNode(rootSpouse, allPersons, allSpouses);
  }

  private buildNode(spouse: Spouse, allPersons: Person[], allSpouses: Spouse[]): FamilyNode {
    const husband = allPersons.find(p => p.id === spouse.husbandId);
    const wife = allPersons.find(p => p.id === spouse.wifeId);
    
    const parents: Person[] = [];
    if (husband) parents.push(husband);
    if (wife) parents.push(wife);

    // Bu nikohdan tug'ilgan bolalar
    const childrenPersons = allPersons.filter(p => p.parentSpouseId === spouse.id);
    
    const childrenNodes: FamilyNode[] = childrenPersons.map(child => {
      // Har bir bola uchun uning nikohlarini tekshiramiz
      const childMarriages = allSpouses.filter(s => s.husbandId === child.id || s.wifeId === child.id);
      
      if (childMarriages.length > 0) {
        // Agar bolaning nikohlari bo'lsa, birinchi nikohni (yoki asosiyini) node qilib qaytaramiz
        return this.buildNode(childMarriages[0], allPersons, allSpouses);
      } else {
        // Nikohi bo'lmasa, faqat bolaning o'zini node qilib qaytaramiz
        return {
          parents: [child],
          children: []
        };
      }
    });

    return {
      parents,
      children: childrenNodes.length > 0 ? childrenNodes : undefined
    };
  }

  private getChildNodesForPerson(person: Person, allPersons: Person[], allSpouses: Spouse[]): FamilyNode[] {
    const children = allPersons.filter(p => p.parentSpouseId === person.id); // Legacy support or direct link
    return children.map(child => {
      const childMarriages = allSpouses.filter(s => s.husbandId === child.id || s.wifeId === child.id);
      if (childMarriages.length > 0) {
        return this.buildNode(childMarriages[0], allPersons, allSpouses);
      }
      return { parents: [child], children: [] };
    });
  }

  // ECharts uchun API dan daraxt ma'lumotlarini olish
  async getEchartsTreeById(personId: string) {
    try {
      const data = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/GetPersonById?personId=${personId}`));
      let personsArray: any[] = [];
      if (data && data.result) {
        personsArray = Array.isArray(data.result) ? data.result : [data.result];
      }
      if (personsArray.length === 0) return null;

      // Daraxtni ECharts formatiga o'tkazish
      const mapToEchartsNode = (node: any): any => {
        return {
          name: `${node.firstName || ''} ${node.lastName || ''}`.trim(),
          originalData: node, // Qo'shimcha ma'lumotlar uchun saqlab qo'yamiz
          children: (node.children && node.children.length > 0) 
            ? node.children.map((child: any) => mapToEchartsNode(child)) 
            : undefined
        };
      };

      // Agar bitta root bo'lsa, uni qaytaramiz. Ko'p bo'lsa, bitta qalbaki root yaratamiz.
      if (personsArray.length === 1) {
        return mapToEchartsNode(personsArray[0]);
      } else {
        return {
          name: 'Sulola',
          children: personsArray.map(p => mapToEchartsNode(p))
        };
      }
    } catch (error) {
      console.error('API dan daraxtni olishda xato:', error);
      return null;
    }
  }

  async addPerson(person: Person) {
    const cleanPerson = this.preparePersonData(person, true);
    const res = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/CreatePerson`, cleanPerson));
    
    // Agar javob muvaffaqiyatli bo'lsa (result true yoki statusCode 200), ro'yxatni yangilaymiz
    if (res && (res.result === true || res.statusCode === 200)) {
      await this.refreshPersons();
      await this.refreshLinkedPersons();
    }
    return res;
  }

  async updatePerson(person: Person) {
    const cleanPerson = this.preparePersonData(person, false);
    const res = await firstValueFrom(this.http.put<any>(`${this.apiUrl}/UpdatePerson`, cleanPerson));
    
    // Agar javob muvaffaqiyatli bo'lsa (result true yoki statusCode 200), ro'yxatni yangilaymiz
    if (res && (res.result === true || res.statusCode === 200)) {
      await this.refreshPersons();
      await this.refreshLinkedPersons();
    }
    return res;
  }

  private preparePersonData(person: Person, isNew: boolean): any {
    const {
      name, role, imageUrl, location, bio, parentId, spouseId,
      ...data
    } = person as any;

    if (isNew) {
      delete data.id;
    }

    Object.keys(data).forEach(key => {
      // Bo'sh stringlarni olib tashlash
      if (data[key] === '') {
        delete data[key];
      }

      // Sanalarni UTC formatiga o'tkazish (PostgreSQL uchun zarur)
      if ((key === 'birthDate' || key === 'deathDate') && data[key]) {
        const date = new Date(data[key]);
        if (!isNaN(date.getTime())) {
          data[key] = date.toISOString();
        }
      }

      // phoneNumber ni songa (Int64) o'tkazish
      if (key === 'phoneNumber' && data[key] !== undefined && data[key] !== null) {
        // Faqat raqamlarni qoldiramiz (Int64 kutilayotgani uchun barcha harf va belgilarni olib tashlaymiz)
        const cleanVal = String(data[key]).replace(/\D/g, '');
        if (cleanVal !== '') {
          data[key] = parseInt(cleanVal, 10);
        } else {
          delete data[key];
        }
      }
    });

    return data;
  }

  async deletePerson(id: string) {
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`));
    await this.refreshPersons();
    await this.refreshLinkedPersons();
  }

  // SPOUSE (NIKOH) METODLARI
  async refreshSpouses(searchTerm?: string) {
    try {
      const spouseApiUrl = 'http://localhost:7133/api/Person';
      const pageNumber = this.spousesPageNumber();
      const pageSize = this.spousesPageSize();

      const data = await firstValueFrom(this.http.post<any>(`${spouseApiUrl}/GetAllSpouses`, {
        pageNumber: pageNumber,
        pageSize: pageSize,
        sortField: "",
        isDescending: false,
        filters: searchTerm ? { FirstName: searchTerm } : {}
      }));
      
      let spousesArray: any[] = [];
      let totalItems = 0;
      if (data) {
        if (Array.isArray(data)) {
          spousesArray = data;
          totalItems = data.length;
        } else if (data.result && Array.isArray(data.result.items)) {
          spousesArray = data.result.items;
          totalItems = data.result.totalItems || data.result.TotalItems || data.result.items.length;
        } else {
          const possibleArray = data.$values || data.data || data.items || data.result;
          if (Array.isArray(possibleArray)) {
            spousesArray = possibleArray;
            totalItems = possibleArray.length;
          }
        }
      }
      this.totalSpousesSignal.set(totalItems);
      
      console.log('API-dan kelgan nikohlar:', spousesArray);
      if (spousesArray.length > 0) {
        console.log('Birinchi nikoh ob\'ekti kalitlari:', Object.keys(spousesArray[0]));
        console.log('Birinchi nikoh ob\'ekti o\'zi:', spousesArray[0]);
      }

      // Ma'lumotlarni normalizatsiya qilish (id vs Id vs $id)
      const normalizedSpouses = spousesArray.map(s => {
        const id = s.id || s.Id || s.$id;
        if (!id) {
          console.error('Nikoh ob\'ektida ID topilmadi:', s);
        }
        return {
          id: id,
          husbandId: s.husbandId || s.HusbandId || s.husband_id,
          wifeId: s.wifeId || s.WifeId || s.wife_id,
          husbandName: s.husbandName || s.HusbandName || '',
          wifeName: s.wifeName || s.WifeName || '',
          order: s.order || s.Order || s.order_number || 1
        };
      });
      
      console.log('Normalizatsiya qilingan nikohlar:', normalizedSpouses);

      this.spousesSignal.set(normalizedSpouses);
    } catch (error) {
      console.error('Nikohlarni yuklashda xato:', error);
      this.spousesSignal.set([]);
    }
  }

  async addSpouse(spouseDto: any) {
    const spouseApiUrl = 'http://localhost:7133/api/Person';
    const res = await firstValueFrom(this.http.post<any>(`${spouseApiUrl}/AddSpouse`, spouseDto));
    if (res && (res.result === true || res.statusCode === 200)) {
      await this.refreshSpouses();
    }
    return res;
  }

  async deleteSpouse(id: string) {
    const spouseApiUrl = 'http://localhost:7133/api/Person';
    await firstValueFrom(this.http.delete<void>(`${spouseApiUrl}/DeleteSpouse/${id}`));
    await this.refreshSpouses();
  }

  async assignParents(assignDto: { spouseId: string, personId: string, order: number }) {
    console.log('AssignParents ga yuborilayotgan ma\'lumot:', assignDto);
    
    if (!assignDto.spouseId || assignDto.spouseId === 'undefined' || !assignDto.personId || assignDto.personId === 'undefined') {
      alert('Iltimos, farzand va ota-onani tanlang!');
      return null;
    }

    // Backend capitalized DTO (SpouseId, PersonId, Order) kutilmoqda
    const body = {
      SpouseId: assignDto.spouseId,
      PersonId: assignDto.personId,
      Order: assignDto.order
    };

    const res = await firstValueFrom(this.http.put<any>(`${this.apiUrl}/AssignParents`, body));
    
    if (res && (res.result === true || res.statusCode === 200)) {
      await this.refreshPersons();
      await this.refreshLinkedPersons();
    }
    return res;
  }

  // SULOLA (GENERATION) METODLARI
  async refreshGenerations() {
    try {
      const res = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/GetAllGenerations`));
      let gensArray: any[] = [];
      if (res) {
        if (Array.isArray(res)) {
          gensArray = res;
        } else if (res.result && Array.isArray(res.result)) {
          gensArray = res.result;
        } else {
          const possibleArray = res.$values || res.data || res.items || res.result;
          if (Array.isArray(possibleArray)) gensArray = possibleArray;
        }
      }
      this.generationsSignal.set(gensArray);
    } catch (error) {
      console.error('Sulolalarni yuklashda xato:', error);
      this.generationsSignal.set([]);
    }
  }

  async addGeneration(generationDto: any) {
    const res = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/CreateGeneration`, generationDto));
    if (res && (res.result || res.statusCode === 200)) {
      await this.refreshGenerations();
    }
    return res;
  }

  async assignGeneration(personId: string, generationId: string) {
    const body = {
      PersonId: personId,
      GenerationId: generationId
    };
    const res = await firstValueFrom(this.http.put<any>(`${this.apiUrl}/AssignGeneration`, body));
    if (res && (res.result === true || res.statusCode === 200)) {
      await this.refreshPersons();
      await this.refreshGenerations();
    }
    return res;
  }

  async updateGeneration(generationDto: any) {
    const res = await firstValueFrom(this.http.put<any>(`${this.apiUrl}/UpdateGeneration`, generationDto));
    if (res && (res.result || res.statusCode === 200)) {
      await this.refreshGenerations();
    }
    return res;
  }

  async deleteGeneration(generationId: string) {
    const res = await firstValueFrom(this.http.delete<any>(`${this.apiUrl}/DeleteGeneration?generationId=${generationId}`));
    if (res && (res.result || res.statusCode === 200)) {
      await this.refreshGenerations();
      await this.refreshPersons();
      await this.refreshLinkedPersons();
    }
    return res;
  }
}
