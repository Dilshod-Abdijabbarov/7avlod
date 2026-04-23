import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FamilyService, FamilyNode, Person } from '../services/family.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-family-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './family-tree.component.html',
  styleUrls: ['./family-tree.component.css']
})
export class FamilyTreeComponent implements OnInit, OnDestroy {
  selectedPerson: Person | null = null;
  treeData: FamilyNode | null = null;
  private sub: Subscription = new Subscription();

  constructor(private familyService: FamilyService) {}

  ngOnInit() {
    this.sub.add(
      this.familyService.persons$.subscribe(() => {
        this.treeData = this.familyService.getTreeData();
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  selectPerson(person: Person) {
    this.selectedPerson = person;
  }

  closeModal() {
    this.selectedPerson = null;
  }
}
