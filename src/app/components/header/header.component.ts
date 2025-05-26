import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, User, ModelOption } from '../../services/data.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  currentUser: User | null = null;
  currentModel: ModelOption | null = null;
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
    // Get current user and model when component initializes
    this.currentUser = this.dataService.getCurrentUser();
    this.currentModel = this.dataService.getCurrentUserModel();
    this.loadUserData();
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

  loadUserData(): void {
    this.currentUser = this.dataService.getCurrentUser();
    this.currentModel = this.dataService.getCurrentUserModel();
    console.log('Header loaded user data:', {
      user: this.currentUser?.email,
      model: this.currentModel?.value,
    });
  }

  // Add this method to refresh data (call this when coming back from settings)
  refreshUserData(): void {
    console.log('Refreshing header user data...');
    this.loadUserData();
  }

  // Update the goToSettings method to refresh data when returning
  goToSettings(): void {
    this.router.navigate(['/settings']).then(() => {
      this.showUserMenu = false;
    });
  }

  // Navigate to profile page (placeholder)
  goToProfile(): void {
    // For now, redirect to settings with profile tab
    this.router.navigate(['/settings'], { fragment: 'profile' });
    this.showUserMenu = false;
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

  getCurrentModelName(): string {
    // Refresh the model data to ensure it's current
    this.currentModel = this.dataService.getCurrentUserModel();
    return this.currentModel?.value || 'Default Model';
  }
}
