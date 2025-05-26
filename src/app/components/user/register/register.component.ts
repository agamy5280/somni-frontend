import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { DataService, ModelOption } from '../../../services/data.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  animations: [
    trigger('fadeInOut', [
      state(
        'void',
        style({
          opacity: 0,
          transform: 'translateY(20px)',
        })
      ),
      transition('void <=> *', animate('300ms ease-in-out')),
    ]),
    trigger('slideIn', [
      state(
        'void',
        style({
          opacity: 0,
          transform: 'translateX(-30px)',
        })
      ),
      transition('void => *', [animate('400ms ease-out')]),
    ]),
    trigger('shake', [
      state(
        'idle',
        style({
          transform: 'translateX(0)',
        })
      ),
      state(
        'shake',
        style({
          transform: 'translateX(0)',
        })
      ),
      transition('idle => shake', [
        animate('100ms', style({ transform: 'translateX(-10px)' })),
        animate('100ms', style({ transform: 'translateX(10px)' })),
        animate('100ms', style({ transform: 'translateX(-10px)' })),
        animate('100ms', style({ transform: 'translateX(10px)' })),
        animate('100ms', style({ transform: 'translateX(0)' })),
      ]),
    ]),
  ],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  currentStep = 1;
  totalSteps = 3; // Updated to 3 steps
  shakeState = 'idle';
  errorMessage: string | null = null;
  availableModels: ModelOption[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private dataService: DataService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      // Step 1
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],

      // Step 2
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],

      // Step 3 - Model preference
      preferredModel: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // If already logged in, redirect to chatbot
    if (this.dataService.isLoggedIn()) {
      this.router.navigate(['/chatbot']);
    }

    // Load available models
    this.availableModels = this.dataService.getAvailableModels();

    // Set default model
    const defaultModel = this.dataService.getDefaultModel();
    this.registerForm.patchValue({
      preferredModel: defaultModel.key,
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = null;

    // Check if we're on the last step
    if (this.currentStep < this.totalSteps) {
      this.nextStep();
      return;
    }

    // Validate final step
    if (this.registerForm.invalid) {
      this.shakeForm();
      return;
    }

    // Check if passwords match
    if (this.f['password'].value !== this.f['confirmPassword'].value) {
      this.f['confirmPassword'].setErrors({ mismatch: true });
      this.shakeForm();
      return;
    }

    this.loading = true;

    // Register the user with DataService including model preference
    this.dataService
      .register(
        this.f['fullName'].value,
        this.f['email'].value,
        this.f['password'].value,
        this.f['preferredModel'].value
      )
      .subscribe({
        next: (user) => {
          console.log(
            'User registered successfully with model:',
            user.preferredModel
          );
          this.router.navigate(['/chatbot']);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Registration failed';
          this.loading = false;
          this.shakeForm();
        },
      });
  }

  nextStep() {
    // Validate the current step fields
    if (this.currentStep === 1) {
      if (this.f['fullName'].invalid || this.f['email'].invalid) {
        this.shakeForm();
        return;
      }
    } else if (this.currentStep === 2) {
      if (this.f['password'].invalid || this.f['confirmPassword'].invalid) {
        this.shakeForm();
        return;
      }

      // Check if passwords match
      if (this.f['password'].value !== this.f['confirmPassword'].value) {
        this.f['confirmPassword'].setErrors({ mismatch: true });
        this.shakeForm();
        return;
      }
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.submitted = false; // Reset submission state for the next step
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.submitted = false; // Reset submission state for the previous step
    }
  }

  getStepClass(step: number) {
    if (step < this.currentStep) return 'completed';
    if (step === this.currentStep) return 'current';
    return 'upcoming';
  }

  getStepLabel(step: number): string {
    switch (step) {
      case 1:
        return 'Account';
      case 2:
        return 'Security';
      case 3:
        return 'Preferences';
      default:
        return '';
    }
  }

  getSelectedModel(): ModelOption | undefined {
    const selectedKey = this.f['preferredModel'].value;
    return this.availableModels.find((model) => model.key === selectedKey);
  }

  shakeForm() {
    this.shakeState = 'shake';
    setTimeout(() => (this.shakeState = 'idle'), 500);
  }
}
