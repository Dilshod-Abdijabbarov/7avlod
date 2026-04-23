import { Component } from '@angular/core';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.css']
})
export class UserInfoComponent {
  user = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    imageUrl: 'https://via.placeholder.com/150'
  };

  onImageError(event: any) {
    event.target.src = 'https://via.placeholder.com/150?text=User';
  }
}