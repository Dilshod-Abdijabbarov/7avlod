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

  fallbackImageUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjAgMTIwIj48Y2lyY2xlIGN4PSI2MCIgY3k9IjYwIiByPSI2MCIgZmlsbD0iIzQ4OThlMiIgLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNNDkuOTg4IDQxLjVhMTguNSA4IDEgMCAxIDM3IDEuNzUgMTguNSAxOC41IDAgMCAxLTM3LTEuNzV6bTAtLjVhMTkuNSAxOS41IDAgMCAwIDM5IDAgMTkuNSAxOS41IDAgMCAwLTM5IDB6TTM1LjUgODIuNThjMC0xNy4xNCAxMi43LTE4LjUgMjQuNS0xOC41IDEwLjIgMCAyMy42IDEuODQgMjUuNSA4LjUgOS45IDEyLjUgMTIuNSAyMy41IDEyLjUgMzMuMEM5OC4zIDg4LjkgOTIuMDkgODAgNzAgODAgNTAuMSA4MCAzNS41IDY4LjUgMzUuNSA4Mi41OHoiIC8+PC9zdmc+';

  onImageError(event: any) {
    event.target.src = this.fallbackImageUrl;
  }
}