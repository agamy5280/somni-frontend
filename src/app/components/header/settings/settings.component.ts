import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService, User, ModelOption } from '../../../services/data.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  currentUser: User | null = null;
  currentModel: ModelOption | null = null;

  // Model preference form and data
  modelPreferenceForm: FormGroup;
  availableModels: ModelOption[] = [];
  loading = false;
  submitted = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private dataService: DataService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    // Initialize model preference form
    this.modelPreferenceForm = this.formBuilder.group({
      selectedModel: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadModelData();
  }

  loadUserData(): void {
    this.currentUser = this.dataService.getCurrentUser();
    this.currentModel = this.dataService.getCurrentUserModel();

    if (!this.currentUser) {
      // If no user is logged in, redirect to login
      this.router.navigate(['/login']);
    }
  }

  loadModelData(): void {
    this.availableModels = this.dataService.getAvailableModels();

    if (this.currentModel) {
      this.modelPreferenceForm.patchValue({
        selectedModel: this.currentModel.key,
      });
    }
  }

  // Model preference methods
  get f() {
    return this.modelPreferenceForm.controls;
  }

  getSelectedModelInfo(): ModelOption | undefined {
    const selectedKey = this.f['selectedModel'].value;
    return this.availableModels.find((model) => model.key === selectedKey);
  }

  hasChanges(): boolean {
    const selectedKey = this.f['selectedModel'].value;
    return selectedKey !== this.currentModel?.key;
  }

  onSave(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;
    if (this.modelPreferenceForm.invalid) {
      return;
    }

    if (!this.hasChanges()) {
      this.successMessage = 'No changes to save';
      return;
    }

    this.loading = true;
    const selectedModelKey = this.f['selectedModel'].value;

    if (!this.currentUser) {
      this.errorMessage = 'No user logged in';
      this.loading = false;
      return;
    }
    this.dataService
      .updateUserModel(this.currentUser.id, selectedModelKey)
      .subscribe({
        next: (updatedUser) => {
          this.loading = false;
          this.successMessage = 'AI model preference updated successfully!';

          // Refresh all user data
          this.loadUserData();
          this.loadModelData();

          // Show success message briefly, then redirect to chatbot
          setTimeout(() => {
            this.router.navigate(['/chatbot']);
          }, 500);
        },
        error: (error) => {
          console.error('=== UPDATE FAILED ===');
          console.error('Error details:', error);

          this.loading = false;
          this.errorMessage =
            error.message || 'Failed to update model preference';
        },
      });
  }

  onCancel(): void {
    // Reset form to current model
    if (this.currentModel) {
      this.modelPreferenceForm.patchValue({
        selectedModel: this.currentModel.key,
      });
    }
    this.errorMessage = null;
    this.successMessage = null;
    this.submitted = false;
  }

  goBack(): void {
    // Navigate back to the previous page or default to chatbot
    this.router.navigate(['/chatbot']).then(() => {
      // Force a refresh of user data in localStorage
      window.location.reload();
    });
  }
}
