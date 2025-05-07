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
  showRoutes = false; // New property to track routes visibility

  // Define the routes to display when sidebar icon is clicked
  navigationRoutes = [
    { path: '/chatbot', label: 'Chatbot', icon: 'fa-comment-dots' },
    { path: '/dashboards', label: 'Dashboards', icon: 'fa-chart-pie' },
    { path: '/reports', label: 'Reports', icon: 'fa-file-alt' },
    {
      path: '/geolocation',
      label: 'Location Detector',
      icon: 'fa-map-marker-alt',
    },
  ];

  constructor(private dataService: DataService, private router: Router) {}

  ngOnInit(): void {
    // Get current user when component initializes
    this.currentUser = this.dataService.getCurrentUser();
  }

  onToggleSidebar(): void {
    // Toggle the routes visibility
    this.showRoutes = !this.showRoutes;

    // Still emit the toggle event for backward compatibility
    this.toggleSidebar.emit();
  }

  // Add method to navigate to a specific route
  navigateTo(route: string): void {
    this.router.navigate([route]);
    // Hide the routes after navigation (optional)
    this.showRoutes = false;
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
