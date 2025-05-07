import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  NgZone,
  ViewEncapsulation,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { saveAs } from 'file-saver';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as turf from '@turf/turf';
import * as L from 'leaflet';
import Fuse from 'fuse.js';
import { Chart, registerables } from 'chart.js';

import { icon, Marker } from 'leaflet';
const iconRetinaUrl = 'assets/leaflet/marker-icon-2x.png';
const iconUrl = 'assets/leaflet/marker-icon.png';
const shadowUrl = 'assets/leaflet/marker-shadow.png';
const iconDefault = icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
Marker.prototype.options.icon = iconDefault;

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-geolocation',
  standalone: false,
  templateUrl: './geolocation.component.html',
  styleUrl: './geolocation.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GeolocationComponent implements OnInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;
  @ViewChild('pieChart') pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartCanvas!: ElementRef<HTMLCanvasElement>;

  // Data storage
  countriesData: any = null;
  citiesData: any[] = [];

  // UI state
  isLoading = false;
  dataLoaded = false;
  processingComplete = false;
  uploadProgress = 0;
  processingProgress = 0;

  // File data
  inputData: any[] = [];
  outputData: any[] = [];
  columnMap: Record<string, string> = {};

  // Processing stats
  stats = {
    totalRecords: 0,
    detectedLocations: 0,
    missingCoordinates: 0,
    topCountries: [] as { country: string; count: number }[],
    processingTime: 0,
  };

  // Map and visualization
  map: L.Map | undefined;
  locationMarkers: L.LayerGroup | undefined;
  pieChart: Chart | undefined;
  barChart: Chart | undefined;

  // Processed data for display
  displayData: any[] = [];

  // For fuzzy matching
  countryFuse: Fuse<any> | undefined;
  cityFuse: Fuse<any> | undefined;

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Load geographical data on init
    this.loadGeographicalData();
  }

  /**
   * Load countries and cities data
   */
  loadGeographicalData(): void {
    this.isLoading = true;
    this.snackBar.open('Loading geographical data...', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['centered-snackbar'],
    });

    // Load countries GeoJSON
    this.http.get('assets/data/countries.geojson').subscribe(
      (data: any) => {
        this.countriesData = data;
        console.log('Countries data loaded successfully');

        // Setup country fuzzy search
        interface Country {
          code: string;
          name: string;
          geometry: GeoJSON.Geometry;
        }

        const countryList: Country[] = data.features.map((f: any) => ({
          code: f.properties.ISO_A2 as string,
          name: f.properties.NAME as string,
          geometry: f.geometry as GeoJSON.Geometry,
        }));

        this.countryFuse = new Fuse(countryList, {
          keys: ['name', 'code'],
          threshold: 0.3,
        });

        // Load cities data after countries are loaded
        this.loadCitiesData();
      },
      (error) => {
        console.error('Error loading countries data:', error);
        this.snackBar.open('Failed to load countries data', '', {
          duration: 3000,
          horizontalPosition: 'center',
          panelClass: ['centered-snackbar', 'error-snackbar'],
        });
        this.isLoading = false;
      }
    );
  }

  /**
   * Load cities data from text file
   */
  loadCitiesData(): void {
    this.http
      .get('assets/data/cities15000.txt', { responseType: 'text' })
      .subscribe(
        (data: string) => {
          // Parse the tab-delimited cities file
          const lines = data.split('\n');
          this.citiesData = lines
            .filter((line) => line.trim().length > 0)
            .map((line) => {
              const parts = line.split('\t');
              if (parts.length >= 19) {
                return {
                  geonameid: parts[0],
                  name: parts[1],
                  ascii_name: parts[2],
                  alternate_names: parts[3] ? parts[3].split(',') : [],
                  lat: parseFloat(parts[4]),
                  lon: parseFloat(parts[5]),
                  country_code: parts[8].toUpperCase(),
                  admin1_code: parts[10],
                  population: parseInt(parts[14]) || 0,
                  timezone: parts[17],
                };
              }
              return null;
            })
            .filter((city) => city !== null);

          console.log(`Loaded ${this.citiesData.length} cities`);

          // Setup city fuzzy search
          this.cityFuse = new Fuse(this.citiesData, {
            keys: ['name', 'ascii_name', 'alternate_names'],
            threshold: 0.3,
          });

          this.isLoading = false;
          this.dataLoaded = true;
          this.snackBar.open('Geographical data loaded successfully', '', {
            duration: 2000,
            horizontalPosition: 'center',
            panelClass: ['centered-snackbar'],
          });
        },
        (error) => {
          console.error('Error loading cities data:', error);
          this.snackBar.open('Failed to load cities data', '', {
            duration: 3000,
            horizontalPosition: 'center',
            panelClass: ['centered-snackbar', 'error-snackbar'],
          });
          this.isLoading = false;
        }
      );
  }

  /**
   * Handle file upload
   */
  onFileSelected(event: any): void {
    const file = event.addedFiles[0];
    if (!file) return;

    this.isLoading = true;
    this.uploadProgress = 0;
    this.processingProgress = 0;
    this.processingComplete = false;

    // Display file info
    this.snackBar.open(`Processing file: ${file.name}`, '', {
      duration: 2000,
      horizontalPosition: 'center',
      panelClass: ['centered-snackbar'],
    });

    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      this.parseCSVFile(file);
    } else if (['xlsx', 'xls'].includes(fileExt)) {
      this.parseExcelFile(file);
    } else {
      this.snackBar.open(
        'Unsupported file format. Please upload CSV or Excel file.',
        '',
        {
          duration: 3000,
          horizontalPosition: 'center',
          panelClass: ['centered-snackbar', 'error-snackbar'],
        }
      );
      this.isLoading = false;
    }
  }

  /**
   * Parse CSV file using PapaParse
   */
  parseCSVFile(file: File): void {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (
            !results ||
            !results.data ||
            !Array.isArray(results.data) ||
            results.data.length === 0
          ) {
            throw new Error('Invalid CSV structure');
          }

          this.uploadProgress = 100;
          this.inputData = results.data;
          this.stats.totalRecords = this.inputData.length;

          // Log a sample of the data for debugging
          console.log('CSV Sample:', this.inputData.slice(0, 3));

          // Verify required columns exist
          this.verifyAndProcessData();
        } catch (error) {
          console.error('Error processing CSV data:', error);
          this.snackBar.open(
            `Error parsing CSV file: ${
              error instanceof Error ? error.message : 'Invalid format'
            }`,
            '',
            {
              duration: 3000,
              horizontalPosition: 'center',
              panelClass: ['centered-snackbar', 'error-snackbar'],
            }
          );
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        this.snackBar.open(
          `Error parsing CSV file: ${
            error instanceof Error ? error.message : 'Invalid format'
          }`,
          '',
          {
            duration: 3000,
            horizontalPosition: 'center',
            panelClass: ['centered-snackbar', 'error-snackbar'],
          }
        );
        this.isLoading = false;
      },
      chunkSize: 1024 * 1024, // 1MB chunks
      chunk: (results, parser) => {
        const progress = Math.min(
          98,
          Math.round((results.meta.cursor / file.size) * 100)
        );
        this.ngZone.run(() => {
          this.uploadProgress = progress;
        });
      },
    });
  }

  /**
   * Parse Excel file using SheetJS (xlsx)
   */
  parseExcelFile(file: File): void {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

        if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
          throw new Error('Invalid Excel structure');
        }

        this.uploadProgress = 100;
        this.inputData = jsonData;
        this.stats.totalRecords = this.inputData.length;

        // Log a sample of the data for debugging
        console.log('Excel Sample:', this.inputData.slice(0, 3));

        // Verify required columns exist
        this.verifyAndProcessData();
      } catch (error) {
        console.error('Error processing Excel data:', error);
        this.snackBar.open(
          `Error parsing Excel file: ${
            error instanceof Error ? error.message : 'Invalid format'
          }`,
          '',
          {
            duration: 3000,
            horizontalPosition: 'center',
            panelClass: ['centered-snackbar', 'error-snackbar'],
          }
        );
        this.isLoading = false;
      }
    };

    reader.onerror = () => {
      this.snackBar.open('Failed to read Excel file', 'Error', {
        duration: 3000,
      });
      this.isLoading = false;
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        this.ngZone.run(() => {
          this.uploadProgress = progress < 100 ? progress : 98;
        });
      }
    };

    // Read file as array buffer
    reader.readAsArrayBuffer(file);
  }

  /**
   * Verify required columns and process data
   */
  verifyAndProcessData(): void {
    // Check for required columns - normalize names to lowercase for case-insensitive checking
    const requiredColumns = ['login gps latitude', 'login gps longitude'];

    // Get actual column names from the first row
    if (this.inputData.length === 0) {
      this.snackBar.open('File is empty', '', {
        duration: 3000,
        horizontalPosition: 'center',
        panelClass: ['centered-snackbar', 'error-snackbar'],
      });
      this.isLoading = false;
      return;
    }

    const firstRow = this.inputData[0];
    const columnNames = Object.keys(firstRow).map((key) => key.toLowerCase());

    // Normalize required column names for checking
    const normalizedRequiredColumns = requiredColumns.map((col) =>
      col.toLowerCase()
    );

    // Find missing columns - checking both exact match and partial match
    const missingColumns = normalizedRequiredColumns.filter(
      (reqCol) =>
        !columnNames.some((col) => col === reqCol || col.includes(reqCol))
    );

    if (missingColumns.length > 0) {
      this.snackBar.open(
        `Missing required columns: ${missingColumns.join(', ')}`,
        '',
        {
          duration: 5000,
          horizontalPosition: 'center',
          panelClass: ['centered-snackbar', 'error-snackbar'],
        }
      );
      console.error('Available columns:', columnNames);
      console.error('Required columns:', normalizedRequiredColumns);
      this.isLoading = false;
      return;
    }

    // Normalize column names to ensure consistent access regardless of case
    const columnMap: Record<string, string> = {};
    for (const key of Object.keys(firstRow)) {
      const normalizedKey = key.toLowerCase();
      // Map required columns
      for (const reqCol of normalizedRequiredColumns) {
        if (normalizedKey === reqCol || normalizedKey.includes(reqCol)) {
          columnMap[reqCol] = key;
        }
      }
    }

    console.log('Column mapping:', columnMap);

    // Store column mapping for later use
    this.columnMap = columnMap;

    // Process the data
    this.processData();
  }

  /**
   * Process data to add location information
   */
  processData(): void {
    const startTime = new Date().getTime();
    this.stats.detectedLocations = 0;
    this.stats.missingCoordinates = 0;
    this.outputData = [];

    // Map column names - use the actual column names from the input file
    const latColumn = this.columnMap['login gps latitude'];
    const lonColumn = this.columnMap['login gps longitude'];

    // Process in chunks to keep UI responsive
    const chunkSize = 100;
    const totalChunks = Math.ceil(this.inputData.length / chunkSize);
    let currentChunk = 0;

    const processChunk = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(
        (currentChunk + 1) * chunkSize,
        this.inputData.length
      );

      for (let i = start; i < end; i++) {
        const row = { ...this.inputData[i] };

        // Add new columns
        row['Detected City'] = null;
        row['Detected Country'] = null;
        row['Country Code'] = null;
        row['Location Status'] = null;

        // Get GPS coordinates using the mapped column names and convert to numbers
        const lat = this.toNumber(row[latColumn]);
        const lon = this.toNumber(row[lonColumn]);

        // Skip empty coordinates
        if (lat === null || lon === null) {
          row['Location Status'] = 'Missing coordinates';
          this.stats.missingCoordinates++;
          this.outputData.push(row);
          continue;
        }

        // Store the parsed numeric values back in the row
        row[latColumn] = lat;
        row[lonColumn] = lon;

        // Find nearest city
        const nearestCity = this.findNearestCity(lat, lon);

        if (nearestCity) {
          // Get country information
          const countryCode = nearestCity.country_code;
          const countryName = this.getCountryFromCode(countryCode);

          // Update row with location information
          row['Detected City'] = nearestCity.name;
          row['Detected Country'] = countryName;
          row['Country Code'] = countryCode;
          row['Location Status'] = 'Detected';
          this.stats.detectedLocations++;
        } else {
          row['Location Status'] = 'No city found';
        }

        this.outputData.push(row);
      }

      // Update progress
      currentChunk++;
      this.processingProgress = Math.round((currentChunk / totalChunks) * 100);

      // Process next chunk or finish
      if (currentChunk < totalChunks) {
        setTimeout(processChunk, 0);
      } else {
        // Processing complete
        const endTime = new Date().getTime();
        this.stats.processingTime = (endTime - startTime) / 1000;

        // Calculate top countries
        const countryCounts: Record<string, number> = {};
        this.outputData.forEach((row) => {
          const country = row['Detected Country'];
          if (country) {
            countryCounts[country] = (countryCounts[country] || 0) + 1;
          }
        });

        this.stats.topCountries = Object.entries(countryCounts)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => (b.count as number) - (a.count as number))
          .slice(0, 10);

        // Prepare display data (limit to first 1000 rows for performance)
        this.displayData = this.outputData.slice(0, 1000);

        this.processingComplete = true;
        this.isLoading = false;

        // Initialize visualizations after data is processed
        setTimeout(() => {
          this.initializeMap();
          this.createCharts();
        }, 100);

        this.snackBar.open('Data processing complete', '', {
          duration: 3000,
          horizontalPosition: 'center',
          panelClass: ['centered-snackbar'],
        });
      }
    };

    // Start processing
    processChunk();
  }

  /**
   * Find nearest city to coordinates
   */
  findNearestCity(lat: number, lon: number): any {
    if (!this.citiesData || this.citiesData.length === 0) {
      return null;
    }

    // Simple implementation - find city with minimum distance
    let minDistance = Infinity;
    let nearestCity = null;

    for (const city of this.citiesData) {
      const distance = this.calculateDistance(lat, lon, city.lat, city.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }

    return nearestCity;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Use turf.js for distance calculation
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    return turf.distance(from, to, { units: 'kilometers' });
  }

  /**
   * Get country name from country code
   */
  getCountryFromCode(code: string): string {
    if (!code || !this.countriesData) return 'Unknown';

    const feature = this.countriesData.features.find(
      (f: { properties: { ISO_A2: string } }) =>
        f.properties.ISO_A2 === code.toUpperCase()
    );

    return feature ? feature.properties.NAME : code;
  }

  /**
   * Initialize the map with location markers
   */
  initializeMap(): void {
    if (!this.mapContainer) return;

    // Create map if it doesn't exist
    if (!this.map) {
      this.map = L.map(this.mapContainer.nativeElement).setView([20, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      this.locationMarkers = L.layerGroup().addTo(this.map);
    } else {
      // Clear existing markers
      if (this.locationMarkers) {
        this.locationMarkers.clearLayers();
      }
    }

    // Add markers for locations
    const locations = this.outputData
      .filter(
        (row) =>
          row['Detected City'] &&
          row[this.columnMap['login gps latitude']] &&
          row[this.columnMap['login gps longitude']]
      )
      .slice(0, 1000); // Limit to 1000 markers for performance

    // Create markers
    locations.forEach((location) => {
      const lat = location[this.columnMap['login gps latitude']];
      const lon = location[this.columnMap['login gps longitude']];

      const marker = L.marker([lat, lon]).bindPopup(`
          <strong>${location['Detected City']}, ${
        location['Detected Country']
      }</strong><br>
          Coordinates: ${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}
        `);

      if (this.locationMarkers) {
        this.locationMarkers.addLayer(marker);
      }
    });

    // Fit map to markers if there are any
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [
          loc[this.columnMap['login gps latitude']],
          loc[this.columnMap['login gps longitude']],
        ])
      );
      this.map.fitBounds(bounds);
    }

    // Force map to resize and re-render
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 200);
  }

  /**
   * Create chart visualizations
   */
  createCharts(): void {
    this.createPieChart();
    this.createBarChart();
  }

  /**
   * Create pie chart for status distribution
   */
  createPieChart(): void {
    if (!this.pieChartCanvas) return;

    // Calculate status counts
    const statusCounts = {
      Detected: this.stats.detectedLocations,
      'Missing coordinates': this.stats.missingCoordinates,
      'No city found':
        this.stats.totalRecords -
        this.stats.detectedLocations -
        this.stats.missingCoordinates,
    };

    // Destroy existing chart if it exists
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    // Create new chart
    const ctx = this.pieChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [
            {
              data: Object.values(statusCounts),
              backgroundColor: [
                'rgba(75, 192, 192, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 205, 86, 0.7)',
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                // This ensures labels don't get cut off
                padding: 20,
                boxWidth: 20,
                font: {
                  size: 12,
                },
              },
              // Increase box width for more space
              display: true,
            },
            title: {
              display: true,
              text: 'Location Detection Status',
              font: {
                size: 16,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.formattedValue;
                  const dataset = context.dataset;
                  const total = dataset.data.reduce(
                    (acc: number, data: number) => acc + data,
                    0
                  );
                  const percentage = Math.round(
                    ((context.raw as number) / total) * 100
                  );
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
        },
      });
    }
  }

  /**
   * Create bar chart for top countries
   */
  createBarChart(): void {
    if (!this.barChartCanvas || !this.stats.topCountries.length) return;

    // Destroy existing chart if it exists
    if (this.barChart) {
      this.barChart.destroy();
    }

    // Get data from top countries
    const labels = this.stats.topCountries.map((item) => item.country);
    const data = this.stats.topCountries.map((item) => item.count);

    // Create new chart
    const ctx = this.barChartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Number of Locations',
              data: data,
              backgroundColor: 'rgba(54, 162, 235, 0.7)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0, // Show whole numbers only
              },
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                autoSkip: false,
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
            },
            title: {
              display: true,
              text: 'Top Countries',
              font: {
                size: 16,
              },
            },
          },
        },
      });
    }
  }

  /**
   * Export processed data to CSV
   */
  exportToCsv(): void {
    if (!this.outputData || this.outputData.length === 0) {
      this.snackBar.open('No data to export', '', {
        duration: 2000,
        horizontalPosition: 'center',
        panelClass: ['centered-snackbar', 'error-snackbar'],
      });
      return;
    }

    // Convert data to CSV
    const csv = Papa.unparse(this.outputData);

    // Create blob and save file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'login_city_geo.csv');

    this.snackBar.open('File exported successfully', '', {
      duration: 2000,
      horizontalPosition: 'center',
      panelClass: ['centered-snackbar'],
    });
  }

  /**
   * Files dropped handler
   */
  onFilesDropped(files: File[]): void {
    if (files.length > 0) {
      this.onFileSelected({ addedFiles: files });
    }
  }
}
