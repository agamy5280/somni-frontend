import { Component, OnInit } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';

interface Report {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
}

@Component({
  selector: 'app-report-generator',
  standalone: false,
  templateUrl: './report-generator.component.html',
  styleUrl: './report-generator.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '500ms ease',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.3)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'scale(1.05)' })),
        animate('200ms ease', style({ transform: 'scale(0.9)' })),
        animate('200ms ease', style({ transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class ReportGeneratorComponent implements OnInit {
  // Reports data
  availableReports: Report[] = [
    {
      id: 'daily-fraud',
      name: 'Daily Fraud Report',
      description:
        'Comprehensive analysis of suspicious transactions detected in the last 24 hours. Includes transaction details, risk scores, and potential fraud patterns.',
      icon: 'fas fa-exclamation-triangle',
      tags: ['Fraud', 'Daily', 'Transactions'],
    },
    {
      id: 'monthly-sales',
      name: 'Monthly Sales Summary',
      description:
        'Monthly aggregated sales data broken down by product category, region, and customer segments. Includes YoY comparison and growth analysis.',
      icon: 'fas fa-chart-line',
      tags: ['Sales', 'Monthly', 'Analytics'],
    },
    {
      id: 'user-activity',
      name: 'User Activity Analysis',
      description:
        'Detailed report on user engagement metrics, session durations, feature usage, and conversion rates across different user segments.',
      icon: 'fas fa-users',
      tags: ['Users', 'Activity', 'Engagement'],
    },
    {
      id: 'inventory-status',
      name: 'Inventory Status Report',
      description:
        'Current inventory levels across all warehouses with stock alerts, reorder suggestions, and inventory turnover metrics.',
      icon: 'fas fa-boxes',
      tags: ['Inventory', 'Stock', 'Warehouse'],
    },
    {
      id: 'financial-forecast',
      name: 'Financial Forecast',
      description:
        'Predictive financial analysis based on historical data, market trends, and growth projections for the next quarter.',
      icon: 'fas fa-chart-pie',
      tags: ['Finance', 'Forecast', 'Analytics'],
    },
  ];

  // Component state
  selectedReport: string = '';
  selectedReportDetails: Report | null = null;
  startDate: string = '';
  endDate: string = '';
  isGenerating: boolean = false;
  isCompleted: boolean = false;
  progressPercentage: number = 0;
  currentStatus: string = '';

  // Process statuses for the fake progress bar
  processingSteps: string[] = [
    'Connecting to secure database...',
    'Authenticating user credentials...',
    'Preparing query parameters...',
    'Executing database query...',
    'Fetching raw transaction data...',
    'Validating data integrity...',
    'Preprocessing data structures...',
    'Applying business rules and filters...',
    'Performing data aggregation...',
    'Calculating key metrics and indicators...',
    'Generating statistical analysis...',
    'Building visualization datasets...',
    'Formatting report structure...',
    'Applying security measures to export...',
    'Finalizing Excel workbook...',
    'Preparing download package...',
  ];

  constructor() {
    // Set default dates (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(today);
  }

  ngOnInit(): void {
    // Component initialization
  }

  // Handle report selection change
  onReportChange(): void {
    this.isCompleted = false;
    this.selectedReportDetails =
      this.availableReports.find(
        (report) => report.id === this.selectedReport
      ) || null;
  }

  // Format date to YYYY-MM-DD for input fields
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Validate date range
  isValidDateRange(): boolean {
    if (!this.startDate || !this.endDate) return false;

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    return start <= end;
  }

  // Generate the report with animated progress
  generateReport(): void {
    if (!this.isValidDateRange()) return;

    this.isGenerating = true;
    this.isCompleted = false;
    this.progressPercentage = 0;
    this.currentStatus = this.processingSteps[0];

    // Simulate the processing with a fake progress bar
    let currentStep = 0;
    const totalSteps = this.processingSteps.length;
    const stepIncrement = 100 / totalSteps;

    const processInterval = setInterval(() => {
      currentStep++;
      this.progressPercentage = Math.min(
        Math.round(currentStep * stepIncrement),
        99
      );

      if (currentStep < totalSteps) {
        this.currentStatus = this.processingSteps[currentStep];
      }

      if (currentStep >= totalSteps) {
        clearInterval(processInterval);

        // Complete the progress after a short delay
        setTimeout(() => {
          this.progressPercentage = 100;
          this.currentStatus = 'Report successfully generated!';

          // Show download button
          setTimeout(() => {
            this.isGenerating = false;
            this.isCompleted = true;
          }, 300);
        }, 500);
      }
    }, 300); // Faster animation - each step takes 300ms
  }

  // Download the report (simulated)
  downloadReport(): void {
    // Get the report name and date range for the filename
    const reportName = this.selectedReportDetails?.name || 'Report';
    const fromDate = new Date(this.startDate).toLocaleDateString();
    const toDate = new Date(this.endDate).toLocaleDateString();

    // Use relative path with leading slash to ensure it's from root
    const filePath = '/assets/data/report.xlsx';

    // Create a file download by fetching the file from assets
    fetch(filePath, {
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${reportName} (${fromDate} to ${toDate}).xlsx`;
        link.setAttribute('rel', 'noopener noreferrer');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((error) => {
        console.error('Error downloading the report:', error);
        alert('Error downloading the report. Please try again.');
      });
  }
}
