import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FamilyService, Person } from '../services/family.service';
import { NgxEchartsModule } from 'ngx-echarts';

@Component({
  selector: 'app-family-tree',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './family-tree.component.html',
  styleUrls: ['./family-tree.component.css']
})
export class FamilyTreeComponent implements OnInit {
  private familyService = inject(FamilyService);
  
  // ECharts uchun kerakli options
  chartOptions = signal<any>(null);
  
  selectedPerson: Person | null = null;
  selectedPersonSpouses: Person[] = [];
  isLoading = signal<boolean>(true);

  async ngOnInit() {
    this.isLoading.set(true);
    // User so'ragan maxsus ID bo'yicha ma'lumotni olamiz
    const personId = 'f1c6d739-48e9-4f5b-952a-d9af5b7e6c31';
    const treeData = await this.familyService.getEchartsTreeById(personId);
    
    if (treeData) {
      this.initChart(treeData);
    }
    this.isLoading.set(false);
  }

  initChart(data: any) {
    this.chartOptions.set({
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        formatter: (params: any) => {
          const person = params.data.originalData;
          if (person) {
            return `<b>${person.firstName} ${person.lastName}</b><br/>${person.middleName || ''}`;
          }
          return params.name;
        }
      },
      series: [
        {
          type: 'tree',
          data: [data],
          left: '2%',
          right: '2%',
          top: '8%',
          bottom: '20%',
          symbolSize: 12,
          symbol: 'emptyCircle',
          orient: 'vertical',
          expandAndCollapse: true,
          label: {
            position: 'top',
            verticalAlign: 'middle',
            align: 'center',
            fontSize: 14,
            distance: 10,
            color: '#fff',
            textBorderColor: '#000',
            textBorderWidth: 2
          },
          leaves: {
            label: {
              position: 'bottom',
              verticalAlign: 'middle',
              align: 'center'
            }
          },
          animationDurationUpdate: 750,
          lineStyle: {
            color: '#7b9ce6',
            width: 2,
            curveness: 0.5
          },
          itemStyle: {
            color: '#1a365d',
            borderColor: '#7b9ce6',
            borderWidth: 2
          }
        }
      ]
    });
  }

  onChartClick(event: any) {
    if (event.data && event.data.originalData) {
      const basicData = event.data.originalData;
      // To'liq ma'lumotlarni persons ro'yxatidan qidiramiz
      const fullPerson = this.familyService.persons().find(p => p.id === basicData.id) || basicData;
      this.selectPerson(fullPerson);
    }
  }

  selectPerson(person: Person) {
    this.selectedPerson = person;
    
    // Turmush o'rtog'ini (xotini/eri) topish
    this.selectedPersonSpouses = [];
    const spouses = this.familyService.spouses();
    const allPersons = this.familyService.persons();
    
    const marriages = spouses.filter(s => s.husbandId === person.id || s.wifeId === person.id);
    for (const m of marriages) {
      const spouseId = m.husbandId === person.id ? m.wifeId : m.husbandId;
      const spouseObj = allPersons.find(p => p.id === spouseId);
      if (spouseObj) {
        this.selectedPersonSpouses.push(spouseObj);
      }
    }
  }

  closeModal() {
    this.selectedPerson = null;
    this.selectedPersonSpouses = [];
  }
}
