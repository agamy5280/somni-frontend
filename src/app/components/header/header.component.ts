import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, User } from '../../services/data.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  currentUser: User | null = null;
  showUserMenu = false;

  constructor(private dataService: DataService, private router: Router) {}

  ngOnInit(): void {
    // Get current user when component initializes
    this.currentUser = this.dataService.getCurrentUser();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
    this.dataService.logout().subscribe({
      next: () => {
        // Navigate to login page after successful logout
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error during logout:', error);
        // Still navigate to login even if there's an error
        this.router.navigate(['/login']);
      },
    });

    // Hide the user menu after logout
    this.showUserMenu = false;
  }

  getUserInitials(): string {
    if (!this.currentUser || !this.currentUser.fullName) {
      return 'U';
    }

    const nameParts = this.currentUser.fullName.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }

    return nameParts[0][0].toUpperCase();
  }
}
