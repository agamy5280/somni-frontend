import {
  Component,
  OnInit,
  AfterViewInit,
  Renderer2,
  ElementRef,
  ViewEncapsulation,
} from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboards',
  standalone: false,
  templateUrl: './dashboards.component.html',
  styleUrl: './dashboards.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DashboardsComponent implements OnInit, AfterViewInit {
  allTabs: any[] = [];
  private keepAliveInterval: any;

  constructor(
    private renderer: Renderer2,
    private el: ElementRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Create and insert page loader
    this.createPageLoader();

    // Ensure we start at the top of the page
    this.scrollToTop();

    // Add keep-alive to prevent session timeouts
    this.setupKeepAlive();
  }

  ngAfterViewInit(): void {
    // Initialize the dashboard
    this.initDashboard();
    this.addCategoryResetButton();
    setTimeout(() => this.scrollToTop(), 100); // Small delay to ensure it happens after other initializations
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto', // Use 'auto' for immediate scrolling instead of 'smooth'
    });
  }
  ngOnDestroy(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
  }
  setupKeepAlive(): void {
    // Cancel any existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Create a ping every 15 seconds
    this.keepAliveInterval = setInterval(() => {
      fetch('/assets/keep-alive.txt?' + new Date().getTime(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      }).catch((err) => console.log('Keep-alive ping failed:', err));
    }, 15000);
  }

  // PAGE LOADER METHODS
  createPageLoader(): void {
    // Create the loader container
    const loaderContainer = this.renderer.createElement('div');
    this.renderer.addClass(loaderContainer, 'page-loader-container');
    this.renderer.setAttribute(loaderContainer, 'id', 'mainPageLoader');

    // Create spinner
    const spinner = this.renderer.createElement('div');
    this.renderer.addClass(spinner, 'page-spinner');

    // Create loading text
    const loadingText = this.renderer.createElement('div');
    this.renderer.addClass(loadingText, 'page-loading-text');
    this.renderer.setProperty(
      loadingText,
      'textContent',
      'Loading Dashboards...'
    );

    // Add counter for progress indication
    const progressCounter = this.renderer.createElement('div');
    this.renderer.addClass(progressCounter, 'progress-counter');
    this.renderer.setAttribute(progressCounter, 'id', 'loaderProgressCounter');
    this.renderer.setProperty(progressCounter, 'textContent', '0%');

    // Append elements
    this.renderer.appendChild(loaderContainer, spinner);
    this.renderer.appendChild(loaderContainer, loadingText);
    this.renderer.appendChild(loaderContainer, progressCounter);

    // Insert as first element in body
    this.renderer.insertBefore(
      document.body,
      loaderContainer,
      document.body.firstChild
    );

    // Check if we have cached content
    const hasCachedContent = this.checkCacheStatus();

    // Simulate faster progress if we have cached content
    this.simulateProgress(progressCounter, hasCachedContent);
  }

  simulateProgress(progressElement: any, useCache: boolean = false): void {
    let progress = 0;
    const interval = setInterval(
      () => {
        // Faster progress for cached content
        const increment = useCache
          ? (100 - progress) / 4
          : (100 - progress) / 15;
        progress += Math.min(increment, useCache ? 8 : 2);

        if (progress >= (useCache ? 95 : 70)) {
          // Stop at 95% for cached, 70% for non-cached
          clearInterval(interval);
          this.renderer.setProperty(
            progressElement,
            'textContent',
            useCache ? '95%' : '70%'
          );

          // Complete loading faster if using cache
          if (useCache) {
            setTimeout(() => this.completeLoading(), 500);
          }
        } else {
          this.renderer.setProperty(
            progressElement,
            'textContent',
            `${Math.floor(progress)}%`
          );
        }
      },
      useCache ? 100 : 300
    ); // Faster intervals for cached content

    // Store interval ID
    (window as any).progressInterval = interval;

    // Only track iframe loading if not using cache
    if (!useCache) {
      this.trackIframeLoading();
    }
  }

  trackIframeLoading(): void {
    setTimeout(() => {
      const iframes = document.querySelectorAll('.visualization-frame');
      (window as any).totalIframes = iframes.length;
      (window as any).loadedIframes = 0;

      if (iframes.length === 0) {
        // No iframes found, just remove the loader
        this.completeLoading();
        return;
      }

      // Update progress text
      const progressElement = document.getElementById('loaderProgressCounter');
      if (progressElement) {
        progressElement.textContent = `Loading visualizations (0/${
          (window as any).totalIframes
        })`;
      }

      // Track each iframe's load event
      iframes.forEach((iframe: any) => {
        // Check if data-loaded attribute is set - if so, consider it loaded
        if (iframe.getAttribute('data-loaded') === 'true') {
          this.incrementLoadedIframes();
        } else if (iframe.complete || iframe.readyState === 'complete') {
          this.incrementLoadedIframes();
        } else {
          iframe.addEventListener('load', () => this.incrementLoadedIframes());
        }
      });

      // Set a timeout to prevent infinite waiting - reduced from 30 to 15 seconds
      setTimeout(() => this.completeLoading(), 15000);
    }, 500);
  }

  incrementLoadedIframes(): void {
    (window as any).loadedIframes++;

    // Calculate progress based on actual iframe loading
    const totalProgress = Math.floor(
      ((window as any).loadedIframes / (window as any).totalIframes) * 100
    );

    // Update progress text
    const progressElement = document.getElementById('loaderProgressCounter');
    if (progressElement) {
      progressElement.textContent = `${totalProgress}% - Loading visualizations (${
        (window as any).loadedIframes
      }/${(window as any).totalIframes})`;
    }

    // If all iframes are loaded, complete the loading process
    if ((window as any).loadedIframes >= (window as any).totalIframes) {
      this.completeLoading();
    }
  }

  completeLoading(): void {
    // Ensure this only runs once
    if ((window as any).loadingCompleted) return;
    (window as any).loadingCompleted = true;

    const loaderContainer = document.getElementById('mainPageLoader');
    const progressCounter = document.getElementById('loaderProgressCounter');

    if (loaderContainer) {
      // Update to 100%
      if (progressCounter) {
        progressCounter.textContent = '100% - Complete';
      }

      // Add fade-out class immediately
      loaderContainer.classList.add('fade-out');

      // Remove after animation completes
      setTimeout(() => {
        loaderContainer.remove();
      }, 500);
    }
  }

  // DASHBOARD METHODS
  initDashboard(): void {
    // Define visualizations to include in the dashboard
    const visualizations = [
      {
        title: 'E-Commerce Weekly',
        filename: 'assets/mule_analysis_output/ECommerce_Weekly.html',
        category: 'digital',
      },
      {
        title: 'Mada Pay Weekly',
        filename: 'assets/mule_analysis_output/Mada_Pay_Weekly.html',
        category: 'digital',
      },
      {
        title: 'Apple Pay Weekly',
        filename: 'assets/mule_analysis_output/Apple_Pay_Weekly.html',
        category: 'digital',
      },
      {
        title: '3DS/Printed Card Weekly',
        filename: 'assets/mule_analysis_output/Printed_Card_Weekly.html',
        category: 'cards',
      },
      {
        title: 'Top Merchants (Current Month)',
        filename:
          'assets/mule_analysis_output/Top_Merchants_Current_Month.html',
        category: 'merchant',
      },
      {
        title: 'Top Merchants (2024)',
        filename: 'assets/mule_analysis_output/Top_Merchant_2024.html',
        category: 'merchant',
      },
      {
        title: 'All Channels Dashboard',
        filename: 'assets/mule_analysis_output/All_Channels.html',
        category: 'overview',
      },
      {
        title: 'Cards Dashboard',
        filename: 'assets/mule_analysis_output/Cards_Dashboard.html',
        category: 'cards',
      },
      {
        title: 'ATM Dashboard',
        filename: 'assets/mule_analysis_output/ATM_Dashboard.html',
        category: 'atm',
      },
      {
        title: 'Corporate Transfers',
        filename: 'assets/mule_analysis_output/Corporate_Transfers.html',
        category: 'transfers',
      },
      {
        title: 'Retail Transfers',
        filename: 'assets/mule_analysis_output/Retail_Transfers.html',
        category: 'transfers',
      },
      {
        title: 'Auth vs Unauth (Current Month)',
        filename:
          'assets/mule_analysis_output/Auth_vs_unauth_Current_Month.html',
        category: 'overview',
      },
      {
        title: 'Mule Accounts Dashboard',
        filename: 'assets/mule_analysis_output/mule_accounts_dashboard.html',
        category: 'mule',
      },
      {
        title: 'New Criteria Mules',
        filename: 'assets/mule_analysis_output/New_Criteria_Mules.html',
        category: 'mule',
      },
      {
        title: 'Cash In Dashboard',
        filename: 'assets/mule_analysis_output/cash_in_dashboard.html',
        category: 'cash',
      },
      {
        title: 'Cash Out Dashboard',
        filename: 'assets/mule_analysis_output/cash_out_dashboard.html',
        category: 'cash',
      },
      {
        title: 'Transfers Dashboard',
        filename: 'assets/mule_analysis_output/Transfers.html',
        category: 'transfers',
      },
    ];

    // Create visualization links in the overview section
    const visualizationLinksContainer = this.el.nativeElement.querySelector(
      '.visualization-links'
    );
    if (visualizationLinksContainer) {
      visualizationLinksContainer.innerHTML = '';

      visualizations.forEach((viz, index) => {
        const link = this.renderer.createElement('div');
        this.renderer.addClass(link, 'visualization-link');
        this.renderer.setAttribute(link, 'data-category', viz.category);

        // Create element for the link
        const linkAnchor = this.renderer.createElement('a');
        this.renderer.setAttribute(linkAnchor, 'href', '#');
        this.renderer.setProperty(linkAnchor, 'textContent', viz.title);
        this.renderer.listen(linkAnchor, 'click', (event) => {
          event.preventDefault();
          this.openTab(`tab${index}`);
          return false;
        });

        // Create paragraph for description
        const paragraph = this.renderer.createElement('p');
        this.renderer.setProperty(
          paragraph,
          'textContent',
          this.getVisualizationDescription(viz.title, viz.category)
        );

        // Append elements to link container
        this.renderer.appendChild(link, linkAnchor);
        this.renderer.appendChild(link, paragraph);
        this.renderer.appendChild(visualizationLinksContainer, link);
      });
    }

    // Create tab buttons
    const tabsContainer = this.el.nativeElement.querySelector('.tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';

      visualizations.forEach((viz, index) => {
        const button = this.renderer.createElement('button');
        this.renderer.addClass(button, 'tab-button');
        if (index === 0) {
          this.renderer.addClass(button, 'active');
        }
        this.renderer.setProperty(button, 'textContent', viz.title);
        this.renderer.setAttribute(button, 'data-category', viz.category);
        this.renderer.listen(button, 'click', () =>
          this.openTab(`tab${index}`)
        );

        this.renderer.appendChild(tabsContainer, button);
      });
    }

    // Create tab contents
    const tabContentsContainer =
      this.el.nativeElement.querySelector('.tab-contents');
    if (tabContentsContainer) {
      tabContentsContainer.innerHTML = '';

      visualizations.forEach((viz, index) => {
        const tabContent = this.renderer.createElement('div');
        this.renderer.setAttribute(tabContent, 'id', `tab${index}`);
        this.renderer.addClass(tabContent, 'tab-content');
        if (index === 0) {
          this.renderer.addClass(tabContent, 'active');
        }

        // Create plot title
        const plotTitle = this.renderer.createElement('div');
        this.renderer.addClass(plotTitle, 'plot-title');
        this.renderer.setProperty(plotTitle, 'textContent', viz.title);

        // Create plot description
        const plotDescription = this.renderer.createElement('div');
        this.renderer.addClass(plotDescription, 'plot-description');
        this.renderer.setProperty(
          plotDescription,
          'textContent',
          this.getVisualizationDescription(viz.title, viz.category)
        );

        // Create legend fix note
        const legendFixNote = this.renderer.createElement('div');
        this.renderer.addClass(legendFixNote, 'legend-fix-note');
        legendFixNote.innerHTML =
          '<strong>Interactive Elements:</strong> You can click and drag legends to reposition them if they overlap. Right-click on legends for additional options.';

        // Create iframe element
        const iframe = this.renderer.createElement('iframe');

        // Don't set src directly anymore - we'll use our loadVisualization method
        // this.renderer.setAttribute(iframe, 'src', viz.filename);

        this.renderer.addClass(iframe, 'visualization-frame');
        this.renderer.setAttribute(iframe, 'id', `frame${index}`);
        this.renderer.setAttribute(iframe, 'data-viz-id', index.toString());
        this.renderer.setAttribute(iframe, 'data-filename', viz.filename);

        // Append all elements to tab content
        this.renderer.appendChild(tabContent, plotTitle);
        this.renderer.appendChild(tabContent, plotDescription);
        this.renderer.appendChild(tabContent, legendFixNote);
        this.renderer.appendChild(tabContent, iframe);

        // Append tab content to container
        this.renderer.appendChild(tabContentsContainer, tabContent);

        // Load only the first (active) tab immediately
        if (index === 0) {
          this.loadVisualization(iframe, viz.filename);
          this.renderer.setAttribute(iframe, 'data-loaded', 'true');
        }
      });
    }

    // Store tab information for later use
    this.allTabs = Array.from(
      this.el.nativeElement.querySelectorAll('.tab-button')
    ).map((button: any, index: number) => ({
      index,
      id: 'tab' + index,
      title: button.textContent,
      category: button.dataset.category,
      element: button,
    }));

    // Setup initial tab
    this.openTab('tab0');

    // Setup iframe event listeners
    this.setupIframeEventListeners();
  }

  // Method to get a description based on the visualization title and category
  getVisualizationDescription(title: string, category: string): string {
    // Category-specific descriptions
    switch (category) {
      case 'digital':
        return 'Analysis of digital payment transactions and trends';
      case 'cards':
        return 'Card transactions analysis and fraud patterns';
      case 'merchant':
        return 'Top merchants by transaction volume and fraud activity';
      case 'overview':
        return 'Overview of all transaction channels and fraud metrics';
      case 'atm':
        return 'ATM transaction analysis and fraud detection';
      case 'transfers':
        if (title.includes('Dashboard')) {
          return 'Comprehensive analysis of transfer transactions with fraud metrics and trends';
        } else {
          return 'Analysis of transfer transactions and related fraud';
        }
      case 'mule':
        return 'Mule account detection and activity monitoring';
      case 'cash':
        return 'Cash transaction analysis and monitoring';
      default:
        // If no category match, use title-based descriptions as fallback
        if (title.includes('Weekly')) {
          return 'Weekly transaction analysis and trends';
        } else if (title.includes('Dashboard')) {
          return 'Comprehensive dashboard with key metrics and charts';
        } else if (title.includes('Merchant')) {
          return 'Analysis of merchant-related transactions and patterns';
        } else {
          return 'Detailed analysis and visualization';
        }
    }
  }

  // Function to apply legend fixes to iframes
  applyLegendFix(iframe: HTMLIFrameElement): void {
    try {
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) return;
      const iframeDocument = iframeWindow.document;

      // Check if document is ready and has head and body
      if (!iframeDocument || !iframeDocument.head || !iframeDocument.body) {
        // If not ready, wait for iframe to load completely and try again
        iframe.onload = () => {
          try {
            if (iframe.contentWindow && iframe.contentWindow.document) {
              this.applyLegendFixToDocument(iframe.contentWindow.document);
            }
          } catch (loadError) {
            console.warn(
              'Could not apply legend fixes to iframe after load:',
              loadError
            );
          }
        };
        return;
      }

      // If document is ready, apply fixes directly
      this.applyLegendFixToDocument(iframeDocument);
    } catch (error) {
      console.warn('Could not apply legend fixes to iframe:', error);
    }
  }

  // Extract the document modification logic to a separate method
  private applyLegendFixToDocument(iframeDocument: Document): void {
    // Add CSS styles
    if (iframeDocument.head) {
      const styleElement = iframeDocument.createElement('style');
      styleElement.textContent = `
    /* Basic fixes for layout */
    body {
      max-width: none !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow-x: hidden !important;
    }
    
    /* Ensure plotly divs take full width */
    .plotly-graph-div,
    .js-plotly-plot,
    .main-svg,
    .svg-container,
    .chart-container,
    .charts-container {
      width: 100% !important;
      max-width: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    
    /* Legend improvements */
    .legend {
      font-size: 10px !important;
      overflow: visible !important;
      pointer-events: all !important;
      background-color: rgba(255, 255, 255, 0.7) !important;
      border-radius: 3px !important;
      padding: 3px !important;
      cursor: move !important;
    }
    
    /* Legend text */
    .legend text, .legendtext {
      font-size: 10px !important;
      text-shadow: 1px 1px 0 white, -1px 1px 0 white, 1px -1px 0 white, -1px -1px 0 white !important;
    }
    
    /* Legend icons */
    .legend rect {
      width: 12px !important;
      height: 12px !important;
    }
    
    /* SVG fixes */
    svg {
      overflow: visible !important;
    }
    
    /* Make chart area slightly smaller to accommodate legends */
    .plot-container {
      margin-right: 10% !important;
    }
    
    /* For Plotly hover labels */
    .hovertext {
      pointer-events: none !important;
    }
    
    /* Fix for chart titles */
    .gtitle {
      font-size: 16px !important;
      font-weight: bold !important;
    }
    
    /* Legend tip */
    .legend-tip {
      position: absolute;
      top: 10px;
      left: 10px;
      background-color: rgba(255, 255, 255, 0.8);
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      color: #333;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      pointer-events: none;
      transition: opacity 0.5s;
    }
    
    /* Context menu styling */
    .legend-context-menu {
      position: absolute;
      background: white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      border-radius: 4px;
      padding: 5px 0;
      z-index: 1000;
    }
    
    .menu-item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .menu-item:hover {
      background-color: #f0f0f0;
    }
    `;
      iframeDocument.head.appendChild(styleElement);
    }

    // Add the script with the improved dragging implementation
    if (iframeDocument.body) {
      const scriptElement = iframeDocument.createElement('script');
      scriptElement.textContent = `
    // Wait for document to be ready
    document.addEventListener('DOMContentLoaded', function() {
      // Give a short delay to ensure elements are loaded
      setTimeout(initializeLegends, 300);
    });
    
    // Function to initialize legends
    function initializeLegends() {
      const legends = document.querySelectorAll('.legend');
      if (legends.length === 0) {
        // If no legends found yet, try again later
        setTimeout(initializeLegends, 300);
        return;
      }
      
      legends.forEach((legend, index) => {
        // Only set up if not already done
        if (!legend.getAttribute('data-initialized')) {
          // Make legends draggable
          makeDraggable(legend);
          
          // Position legends to avoid overlap
          repositionLegend(legend, index, legends.length);
          
          // Mark as initialized
          legend.setAttribute('data-initialized', 'true');
        }
      });
      
      // Add a tip about dragging legends
      addLegendTip();
      
      // Add context menu for right-click
      setupContextMenu();
    }
    
    // Function to make an element draggable
    function makeDraggable(element) {
      if (!element || !element.ownerSVGElement) return;
      
      let isDragging = false;
      let currentX = 0;
      let currentY = 0;
      let startX = 0;
      let startY = 0;
      
      // Get current position
      let transform = element.getAttribute('transform');
      let translate = transform ? transform.match(/translate\\(([^,]+),\\s*([^)]+)\\)/) : null;
      currentX = translate ? parseFloat(translate[1]) : 0;
      currentY = translate ? parseFloat(translate[2]) : 0;
      
      // Handle mousedown events
      element.addEventListener('mousedown', function(e) {
        // Only handle left mouse button
        if (e.button !== 0) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Store starting point
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        
        // Setup document-level event handlers for move and up
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
      
      // Mouse move handler
      function onMouseMove(e) {
        if (!isDragging) return;
        
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;
        
        element.setAttribute('transform', 'translate(' + (currentX + dx) + ',' + (currentY + dy) + ')');
      }
      
      // Mouse up handler
      function onMouseUp(e) {
        if (!isDragging) return;
        
        // Update final position
        let finalTransform = element.getAttribute('transform');
        let finalTranslate = finalTransform ? finalTransform.match(/translate\\(([^,]+),\\s*([^)]+)\\)/) : null;
        currentX = finalTranslate ? parseFloat(finalTranslate[1]) : currentX;
        currentY = finalTranslate ? parseFloat(finalTranslate[2]) : currentY;
        
        isDragging = false;
        
        // Clean up document-level handlers
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
    }
    
    // Function to position legends to avoid overlap
    function repositionLegend(legend, index, total) {
      const svgElement = legend.closest('svg');
      if (!svgElement) return;
      
      const svgRect = svgElement.getBoundingClientRect();
      const svgWidth = svgRect.width;
      const svgHeight = svgRect.height;
      
      // Spread legends along right edge by default
      let xPos = svgWidth - 120;
      let yPos = 50 + (index * 30);
      
      // Ensure legend doesn't go off bottom of SVG
      if (yPos > svgHeight - 50) {
        // Start a new column to the left
        xPos -= 150;
        yPos = 50 + ((index % 4) * 30);
      }
      
      legend.setAttribute('transform', 'translate(' + xPos + ',' + yPos + ')');
    }
    
    // Function to add a tip about dragging legends
    function addLegendTip() {
      // Don't add if already exists
      if (document.querySelector('.legend-tip')) return;
      
      const tip = document.createElement('div');
      tip.className = 'legend-tip';
      tip.textContent = 'Tip: You can drag legends to reposition them';
      document.body.appendChild(tip);
      
      // Fade out after 5 seconds
      setTimeout(() => {
        tip.style.opacity = '0';
        // Remove after fade completes
        setTimeout(() => tip.remove(), 500);
      }, 5000);
    }
    
    // Setup context menu for legends
    function setupContextMenu() {
      const legends = document.querySelectorAll('.legend');
      
      legends.forEach(legend => {
        legend.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          
          // Remove existing menu if any
          const existingMenu = document.querySelector('.legend-context-menu');
          if (existingMenu) existingMenu.remove();
          
          // Create new menu
          const menu = document.createElement('div');
          menu.className = 'legend-context-menu';
          menu.style.left = e.pageX + 'px';
          menu.style.top = e.pageY + 'px';
          
          // Menu options
          const options = [
            {text: 'Move to Top Right', action: () => {
              const svgElement = legend.closest('svg');
              if (svgElement) {
                const svgRect = svgElement.getBoundingClientRect();
                legend.setAttribute('transform', 'translate(' + (svgRect.width - 120) + ',20)');
              }
            }},
            {text: 'Move to Top Left', action: () => {
              legend.setAttribute('transform', 'translate(20,20)');
            }},
            {text: 'Move to Bottom Right', action: () => {
              const svgElement = legend.closest('svg');
              if (svgElement) {
                const svgRect = svgElement.getBoundingClientRect();
                legend.setAttribute('transform', 'translate(' + (svgRect.width - 120) + ',' + (svgRect.height - 50) + ')');
              }
            }},
            {text: 'Move to Bottom Left', action: () => {
              const svgElement = legend.closest('svg');
              if (svgElement) {
                const svgRect = svgElement.getBoundingClientRect();
                legend.setAttribute('transform', 'translate(20,' + (svgRect.height - 50) + ')');
              }
            }},
            {text: 'Hide Legend', action: () => {
              legend.style.display = 'none';
            }},
            {text: 'Show All Legends', action: () => {
              document.querySelectorAll('.legend').forEach(l => {
                l.style.display = '';
              });
            }}
          ];
          
          // Add items to menu
          options.forEach(option => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.textContent = option.text;
            
            item.addEventListener('click', () => {
              option.action();
              menu.remove();
            });
            
            menu.appendChild(item);
          });
          
          // Add menu to document
          document.body.appendChild(menu);
          
          // Close menu when clicking elsewhere
          document.addEventListener('click', function closeMenu(event) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
          });
        });
      });
    }
    
    // Initialize immediately if document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(initializeLegends, 100);
    }
    `;

      iframeDocument.body.appendChild(scriptElement);
    }
  }

  // Handle special cases of problematic visualizations
  handleSpecialCases(iframe: HTMLIFrameElement): void {
    try {
      const iframeDocument = iframe.contentWindow?.document;
      if (!iframeDocument) return;

      const url = iframe.src.toLowerCase();

      // For visualizations with problematic legends, add specific fixes
      if (
        url.includes('ecommerce_weekly') ||
        url.includes('mada_pay') ||
        url.includes('apple_pay')
      ) {
        // Digital payment visualizations - ensure proper rendering
        const styleElement = iframeDocument.createElement('style');
        styleElement.textContent = `
          /* Ensure charts resize properly */
          .plotly-graph-div {
            width: 100% !important;
            height: auto !important;
            min-height: 400px !important;
          }
          /* Fix text overflow */
          .xtick text, .ytick text {
            font-size: 10px !important;
          }
          /* Fix for legends */
          .legend {
            font-size: 10px !important;
          }
        `;
        iframeDocument.head.appendChild(styleElement);
      } else if (url.includes('merchant') || url.includes('top_merchant')) {
        // Merchant visualizations - fix line charts and legends
        const styleElement = iframeDocument.createElement('style');
        styleElement.textContent = `
          /* Ensure chart is visible and well-sized */
          .plotly-graph-div {
            width: 100% !important;
            height: auto !important;
            min-height: 300px !important;
          }
          /* Fix margins */
          .chart-container {
            padding: 10px !important;
            margin: 0 !important;
            width: 100% !important;
          }
        `;
        iframeDocument.head.appendChild(styleElement);
      } else if (
        url.includes('cash_in') ||
        url.includes('cash_out') ||
        url.includes('mule')
      ) {
        // Mule and cash transactions - fix table rendering
        const styleElement = iframeDocument.createElement('style');
        styleElement.textContent = `
          /* Make tables more compact */
          .data-table {
            font-size: 11px !important;
            width: 100% !important;
          }
          .data-table th, .data-table td {
            padding: 3px 6px !important;
          }
          /* Ensure chart is visible */
          .plotly-graph-div {
            width: 100% !important;
            height: auto !important;
            min-height: 300px !important;
          }
        `;
        iframeDocument.head.appendChild(styleElement);
      } else if (url.includes('transfers') || url.includes('transfer')) {
        // Transfer visualizations - fix tables and charts
        const styleElement = iframeDocument.createElement('style');
        styleElement.textContent = `
          /* Ensure tables are properly styled */
          .data-table {
            font-size: 11px !important;
            width: 100% !important;
          }
          .data-table th, .data-table td {
            padding: 3px 6px !important;
          }
          /* Ensure chart is visible */
          .plotly-graph-div {
            width: 100% !important;
            height: auto !important;
            min-height: 300px !important;
          }
          /* Fix charts container */
          .charts-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
          }
        `;
        iframeDocument.head.appendChild(styleElement);
      }

      // General fix for all visualizations to improve legend visibility
      const generalStyleElement = iframeDocument.createElement('style');
      generalStyleElement.textContent = `
        /* Make all legends more visible with background */
        .legend {
          background-color: rgba(255, 255, 255, 0.7) !important;
          padding: 3px !important;
          border-radius: 3px !important;
          cursor: move !important;
          pointer-events: all !important;
        }
        
        /* Fix for charts with horizontal legend layouts */
        .legend-horizontal {
          display: flex !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
          padding: 5px 0 !important;
        }
        
        /* Fix for right-aligned legends */
        svg {
          margin-right: 30px !important;
          overflow: visible !important;
        }
        
        /* Make iframe content responsive */
        body, html {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Ensure chart containers are properly sized */
        .chart-container {
          width: 100% !important;
          box-sizing: border-box !important;
        }
      `;
      iframeDocument.head.appendChild(generalStyleElement);
    } catch (error) {
      console.warn('Could not apply special case handlers:', error);
    }
  }

  // Add context menu for legends in the iframe
  // Add context menu for legends in the iframe
  addLegendContextMenu(iframe: HTMLIFrameElement): void {
    try {
      const iframeDocument = iframe.contentWindow?.document;
      if (!iframeDocument) return;

      // Add context menu script
      const scriptElement = iframeDocument.createElement('script');
      scriptElement.textContent = `
        function setupLegendContextMenu() {
          const legends = document.querySelectorAll('.legend');
          legends.forEach(legend => {
            legend.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              
              // Remove any existing context menus
              const existingMenu = document.getElementById('legend-context-menu');
              if (existingMenu) {
                existingMenu.remove();
              }
              
              // Create context menu
              const menu = document.createElement('div');
              menu.id = 'legend-context-menu';
              menu.style.position = 'absolute';
              menu.style.left = e.pageX + 'px';
              menu.style.top = e.pageY + 'px';
              menu.style.background = 'white';
              menu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
              menu.style.borderRadius = '4px';
              menu.style.padding = '5px 0';
              menu.style.zIndex = '1000';
              
              // Add menu items
              const options = [
                {text: 'Move to Top Right', action: () => legend.setAttribute('transform', 'translate(' + (document.body.clientWidth - 150) + ', 20)')},
                {text: 'Move to Top Left', action: () => legend.setAttribute('transform', 'translate(20, 20)')},
                {text: 'Move to Bottom Left', action: () => legend.setAttribute('transform', 'translate(20, ' + (document.body.clientHeight - 100) + ')')},
                {text: 'Move to Bottom Right', action: () => legend.setAttribute('transform', 'translate(' + (document.body.clientWidth - 150) + ', ' + (document.body.clientHeight - 100) + ')')},
                {text: 'Hide Legend', action: () => legend.style.display = 'none'},
                {text: 'Show All Legends', action: () => document.querySelectorAll('.legend').forEach(l => l.style.display = '')}
              ];
              
              options.forEach(option => {
                const item = document.createElement('div');
                item.textContent = option.text;
                item.style.padding = '8px 12px';
                item.style.cursor = 'pointer';
                item.style.fontSize = '14px';
                
                item.addEventListener('mouseenter', () => {
                  item.style.background = '#f0f0f0';
                });
                
                item.addEventListener('mouseleave', () => {
                  item.style.background = 'white';
                });
                
                item.addEventListener('click', () => {
                  option.action();
                  menu.remove();
                });
                
                menu.appendChild(item);
              });
              
              document.body.appendChild(menu);
              
              // Close menu when clicking elsewhere
              document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
              });
            });
          });
        }
        
        // Run after a delay to ensure elements are loaded
        setTimeout(setupLegendContextMenu, 1500);
        
        // Also run when window resizes
        window.addEventListener('resize', function() {
          setTimeout(setupLegendContextMenu, 500);
        });
      `;

      iframeDocument.body.appendChild(scriptElement);
    } catch (error) {
      console.warn('Could not add legend context menu:', error);
    }
  }

  // Tab switching functionality
  openTab(tabId: string): void {
    // Hide all tab contents
    const tabContents = this.el.nativeElement.querySelectorAll('.tab-content');
    tabContents.forEach((content: HTMLElement) => {
      this.renderer.removeClass(content, 'active');
    });

    // Remove active class from all tab buttons
    const tabButtons = this.el.nativeElement.querySelectorAll('.tab-button');
    tabButtons.forEach((button: HTMLElement) => {
      this.renderer.removeClass(button, 'active');
    });

    // Show the selected tab content
    const selectedTab = this.el.nativeElement.querySelector(`#${tabId}`);
    if (selectedTab) {
      this.renderer.addClass(selectedTab, 'active');
    }

    // Add active class to the clicked button
    const activeTabIndex = parseInt(tabId.replace('tab', ''));
    const activeButton = tabButtons[activeTabIndex];
    if (activeButton) {
      this.renderer.addClass(activeButton, 'active');

      // Ensure the tab is visible if it was hidden by search
      this.renderer.setStyle(activeButton, 'display', 'block');
    }

    // Scroll to the top of the content
    const tabsElement = this.el.nativeElement.querySelector('.tabs');
    if (tabsElement) {
      window.scrollTo({
        top: tabsElement.offsetTop - 20,
        behavior: 'smooth',
      });
    }

    // Load iframe content if not already loaded
    const activeFrame = this.el.nativeElement.querySelector(`#${tabId} iframe`);
    if (activeFrame) {
      if (!activeFrame.getAttribute('data-loaded')) {
        const filename = activeFrame.getAttribute('data-filename');
        if (filename) {
          this.loadVisualization(activeFrame, filename);
          this.renderer.setAttribute(activeFrame, 'data-loaded', 'true');
        }
      }
    }
  }

  // Function to show loading spinner when iframe is loading
  showLoadingSpinner(iframe: HTMLElement): void {
    // Create a spinner container if it doesn't exist
    let spinnerContainer =
      iframe.parentNode?.querySelector('.spinner-container');

    if (!spinnerContainer) {
      spinnerContainer = this.renderer.createElement('div');
      this.renderer.addClass(spinnerContainer, 'spinner-container');

      // Create the spinner element
      const spinner = this.renderer.createElement('div');
      this.renderer.addClass(spinner, 'spinner');

      // Create loading text
      const loadingText = this.renderer.createElement('div');
      this.renderer.addClass(loadingText, 'loading-text');
      this.renderer.setProperty(
        loadingText,
        'textContent',
        'Loading visualization...'
      );

      // Append elements to container
      this.renderer.appendChild(spinnerContainer, spinner);
      this.renderer.appendChild(spinnerContainer, loadingText);

      // Insert spinner container before the iframe in DOM
      this.renderer.insertBefore(iframe.parentNode, spinnerContainer, iframe);
    }

    // Show spinner and hide iframe until loaded
    this.renderer.setStyle(spinnerContainer, 'display', 'flex');
    this.renderer.setStyle(iframe, 'opacity', '0');
  }

  // Function to add category reset button to search container
  addCategoryResetButton(): void {
    // Create a container for the current category display and reset button
    const categoryIndicator = this.renderer.createElement('div');
    this.renderer.addClass(categoryIndicator, 'current-category-indicator');
    this.renderer.setAttribute(
      categoryIndicator,
      'id',
      'currentCategoryIndicator'
    );

    // Create the text label
    const categoryLabel = this.renderer.createElement('span');
    this.renderer.addClass(categoryLabel, 'category-label');
    this.renderer.setProperty(
      categoryLabel,
      'textContent',
      'Current Category: All'
    );

    // Create the reset button
    const resetButton = this.renderer.createElement('button');
    this.renderer.addClass(resetButton, 'category-reset-button');
    this.renderer.setProperty(resetButton, 'innerHTML', 'Show All Categories');
    this.renderer.setAttribute(
      resetButton,
      'title',
      'Reset to show all categories'
    );
    this.renderer.listen(resetButton, 'click', () => {
      this.filterByCategory('all');
      this.updateCategoryIndicator('all');
    });

    // Add the elements to the container
    this.renderer.appendChild(categoryIndicator, categoryLabel);
    this.renderer.appendChild(categoryIndicator, resetButton);

    // Find the search container to add our new element
    const searchContainer =
      this.el.nativeElement.querySelector('.search-container');
    const searchInput = this.el.nativeElement.querySelector('#searchInput');

    if (searchContainer && searchInput) {
      // Insert the category indicator after the search input
      this.renderer.insertBefore(
        searchContainer,
        categoryIndicator,
        searchInput.nextSibling
      );
    }

    // Initially hide the reset button since we start on "All"
    this.renderer.setStyle(resetButton, 'display', 'none');
  }

  // Function to update the category indicator when category changes
  updateCategoryIndicator(category: string): void {
    const indicator = this.el.nativeElement.querySelector(
      '#currentCategoryIndicator'
    );
    if (!indicator) return;

    const categoryLabel = indicator.querySelector('.category-label');
    const resetButton = indicator.querySelector('.category-reset-button');

    // Format the category name (capitalize first letter)
    let displayName = category;
    if (category !== 'all') {
      displayName = category.charAt(0).toUpperCase() + category.slice(1);
    } else {
      displayName = 'All';
    }

    // Update the label
    if (categoryLabel) {
      this.renderer.setProperty(
        categoryLabel,
        'textContent',
        `Current Category: ${displayName}`
      );
    }

    // Show/hide reset button based on category
    if (resetButton) {
      if (category === 'all') {
        this.renderer.setStyle(resetButton, 'display', 'none');
      } else {
        this.renderer.setStyle(resetButton, 'display', 'block');
      }
    }

    // Add highlight animation
    this.renderer.removeClass(indicator, 'category-highlight');
    void indicator.offsetWidth; // Trigger reflow
    this.renderer.addClass(indicator, 'category-highlight');
  }

  // Function to hide loading spinner when iframe is loaded
  hideLoadingSpinner(iframe: HTMLElement): void {
    const spinnerContainer =
      iframe.parentNode?.querySelector('.spinner-container');

    if (spinnerContainer) {
      // Add fade-out class to spinner
      this.renderer.addClass(spinnerContainer, 'fade-out');

      // Show iframe with fade-in effect
      this.renderer.setStyle(iframe, 'transition', 'opacity 0.5s');
      this.renderer.setStyle(iframe, 'opacity', '1');

      // Remove spinner after animation completes
      setTimeout(() => {
        this.renderer.setStyle(spinnerContainer, 'display', 'none');
      }, 500);
    }
  }

  // Navigate between tabs
  navigateTabs(direction: number): void {
    // Find the active tab
    const activeTab = this.el.nativeElement.querySelector(
      '.tab-content.active'
    );
    if (!activeTab) return;

    const activeTabId = activeTab.id;
    const currentIndex = parseInt(activeTabId.replace('tab', ''));

    // Get all visible tabs (not hidden by search or category filter)
    const tabButtons = this.el.nativeElement.querySelectorAll('.tab-button');
    const visibleTabs = Array.from(tabButtons)
      .filter((button) => (button as HTMLElement).style.display !== 'none')
      .map((button, index) => index);

    if (visibleTabs.length === 0) return; // No visible tabs

    // Find current index in visible tabs array
    const currentVisibleIndex = visibleTabs.indexOf(currentIndex);

    let nextIndex;
    if (direction > 0) {
      // Next tab
      if (
        currentVisibleIndex === -1 ||
        currentVisibleIndex === visibleTabs.length - 1
      ) {
        nextIndex = visibleTabs[0]; // Wrap to first
      } else {
        nextIndex = visibleTabs[currentVisibleIndex + 1];
      }
    } else {
      // Previous tab
      if (currentVisibleIndex === -1 || currentVisibleIndex === 0) {
        nextIndex = visibleTabs[visibleTabs.length - 1]; // Wrap to last
      } else {
        nextIndex = visibleTabs[currentVisibleIndex - 1];
      }
    }

    // Open the next tab
    this.openTab('tab' + nextIndex);
  }

  // Search functionality
  searchVisualizations(): void {
    const input = this.el.nativeElement.querySelector(
      '#searchInput'
    ) as HTMLInputElement;
    if (!input) return;

    const filter = input.value.toLowerCase().trim();
    const noResultsElement = this.el.nativeElement.querySelector('#noResults');
    const buttons = this.el.nativeElement.querySelectorAll('.tab-button');
    const links = this.el.nativeElement.querySelectorAll('.visualization-link');

    let hasVisibleTabs = false;

    // Handle empty search
    if (filter === '') {
      // Show all tabs that match the current category filter
      const activeCategoryButton = this.el.nativeElement.querySelector(
        '.category-button.active'
      );

      let activeCategory = 'all';
      if (activeCategoryButton) {
        const onclickAttr = activeCategoryButton.getAttribute('onclick');
        if (onclickAttr) {
          const match = onclickAttr.match(/['"]([^'"]+)['"]/);
          if (match) {
            activeCategory = match[1];
          }
        }
      }

      buttons.forEach((button: HTMLElement) => {
        const buttonCategory = button.dataset['category'];
        const shouldShow =
          activeCategory === 'all' || buttonCategory === activeCategory;
        this.renderer.setStyle(
          button,
          'display',
          shouldShow ? 'block' : 'none'
        );
        hasVisibleTabs = hasVisibleTabs || shouldShow;
      });

      // Also filter the links
      links.forEach((link: HTMLElement) => {
        const linkCategory = link.dataset['category'];
        const shouldShow =
          activeCategory === 'all' || linkCategory === activeCategory;
        this.renderer.setStyle(link, 'display', shouldShow ? 'block' : 'none');
      });
    } else {
      // Filter based on search text and category
      const activeCategoryButton = this.el.nativeElement.querySelector(
        '.category-button.active'
      );

      let activeCategory = 'all';
      if (activeCategoryButton) {
        const onclickAttr = activeCategoryButton.getAttribute('onclick');
        if (onclickAttr) {
          const match = onclickAttr.match(/['"]([^'"]+)['"]/);
          if (match) {
            activeCategory = match[1];
          }
        }
      }

      buttons.forEach((button: HTMLElement) => {
        const text = button.textContent?.toLowerCase() || '';
        const buttonCategory = button.dataset['category'];
        const matchesSearch = text.includes(filter);
        const matchesCategory =
          activeCategory === 'all' || buttonCategory === activeCategory;
        const shouldShow = matchesSearch && matchesCategory;

        this.renderer.setStyle(
          button,
          'display',
          shouldShow ? 'block' : 'none'
        );
        hasVisibleTabs = hasVisibleTabs || shouldShow;
      });

      // Also filter the links
      links.forEach((link: HTMLElement) => {
        const linkAnchor = link.querySelector('a');
        const text = linkAnchor?.textContent?.toLowerCase() || '';
        const linkCategory = link.dataset['category'];
        const matchesSearch = text.includes(filter);
        const matchesCategory =
          activeCategory === 'all' || linkCategory === activeCategory;
        const shouldShow = matchesSearch && matchesCategory;

        this.renderer.setStyle(link, 'display', shouldShow ? 'block' : 'none');
      });
    }

    // Show or hide no results message
    if (noResultsElement) {
      this.renderer.setStyle(
        noResultsElement,
        'display',
        hasVisibleTabs ? 'none' : 'block'
      );
    }

    // If active tab is hidden, switch to first visible tab
    const activeTab = this.el.nativeElement.querySelector('.tab-button.active');
    if (!activeTab || activeTab.style.display === 'none') {
      // Find first visible tab
      const firstVisibleTab = Array.from(buttons).find(
        (button) => (button as HTMLElement).style.display !== 'none'
      ) as HTMLElement;

      if (firstVisibleTab) {
        // Get its index and open that tab
        const index = Array.from(buttons).indexOf(firstVisibleTab);
        this.openTab('tab' + index);
      }
    }
  }

  // Filter by category
  filterByCategory(category: string): void {
    // Update active button
    const categoryButtons =
      this.el.nativeElement.querySelectorAll('.category-button');
    categoryButtons.forEach((button: HTMLElement) => {
      const onclickAttr = button.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes(category)) {
        this.renderer.addClass(button, 'active');
      } else {
        this.renderer.removeClass(button, 'active');
      }
    });

    // Clear search field
    const searchInput = this.el.nativeElement.querySelector(
      '#searchInput'
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }

    // Filter tabs by category
    const tabButtons = this.el.nativeElement.querySelectorAll('.tab-button');
    let hasVisibleTabs = false;

    tabButtons.forEach((button: HTMLElement) => {
      const buttonCategory = button.dataset['category'];
      const shouldShow = category === 'all' || buttonCategory === category;
      this.renderer.setStyle(button, 'display', shouldShow ? 'block' : 'none');
      hasVisibleTabs = hasVisibleTabs || shouldShow;
    });

    // Filter visualization links
    const links = this.el.nativeElement.querySelectorAll('.visualization-link');
    links.forEach((link: HTMLElement) => {
      const linkCategory = link.dataset['category'];
      const shouldShow = category === 'all' || linkCategory === category;
      this.renderer.setStyle(link, 'display', shouldShow ? 'block' : 'none');
    });

    // Show or hide no results message
    const noResultsElement = this.el.nativeElement.querySelector('#noResults');
    if (noResultsElement) {
      this.renderer.setStyle(
        noResultsElement,
        'display',
        hasVisibleTabs ? 'none' : 'block'
      );
    }

    // If current active tab is hidden, switch to first visible tab
    const activeTab = this.el.nativeElement.querySelector('.tab-button.active');
    if (!activeTab || activeTab.style.display === 'none') {
      const firstVisibleTab = Array.from(tabButtons).find(
        (button) => (button as HTMLElement).style.display !== 'none'
      ) as HTMLElement;

      if (firstVisibleTab) {
        const onclick = firstVisibleTab.getAttribute('onclick');
        if (onclick) {
          const match = onclick.match(/openTab\('(tab\d+)'\)/);
          if (match) {
            this.openTab(match[1]);
          }
        }
      }
    }

    // Update URL parameters without refreshing
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('category', category);
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.warn('Could not update URL parameters:', error);
    }

    this.updateCategoryIndicator(category);
  }

  // Setup event listeners for iframe loads
  setupIframeEventListeners(): void {}
  // Check if visualization is cached
  private checkCachedVisualization(filename: string): string | null {
    try {
      const cacheKey = 'viz_cache_' + filename.replace(/[^a-zA-Z0-9]/g, '_');
      return localStorage.getItem(cacheKey);
    } catch (error) {
      console.warn('Error checking cache:', error);
      return null;
    }
  }

  // Save visualization to localStorage
  private saveVisualizationToCache(filename: string, content: string): void {
    try {
      const cacheKey = 'viz_cache_' + filename.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem(cacheKey, content);
      localStorage.setItem('viz_cache_timestamp', Date.now().toString());
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  }

  // Check if we have cached visualizations
  private checkCacheStatus(): boolean {
    try {
      const timestamp = localStorage.getItem('viz_cache_timestamp');
      return !!timestamp;
    } catch (error) {
      return false;
    }
  }

  // Load visualization content (either from cache or from URL)
  private loadVisualization(iframe: HTMLIFrameElement, filename: string): void {
    // Show loading spinner
    this.showLoadingSpinner(iframe);

    // Check if we have this visualization cached
    const cachedContent = this.checkCachedVisualization(filename);

    if (cachedContent) {
      // Use cached content with a small artificial delay to maintain UI appearance
      setTimeout(() => {
        // Write cached content to iframe
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) return;

        iframeDoc.open();
        iframeDoc.write(cachedContent);
        iframeDoc.close();

        // Apply legend fixes after a short delay
        setTimeout(() => {
          this.hideLoadingSpinner(iframe);
          this.applyLegendFix(iframe);
        }, 300);
      }, 200); // Small delay to maintain UI consistency
    } else {
      // Load from URL and cache it
      fetch(filename)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response not ok');
          }
          return response.text();
        })
        .then((html) => {
          // Get the iframe document
          const iframeDoc = iframe.contentWindow?.document;
          if (!iframeDoc) return;

          // Replace all external Plotly and CDN references with local ones
          const modifiedHtml = html
            // Replace Plotly CDN with local reference
            .replace(
              /<script[^>]*src=["']https?:\/\/cdn\.plot\.ly\/plotly[^"']*\.min\.js["'][^>]*><\/script>/g,
              '<script src="/assets/vendor/plotly.min.js"></script>'
            )
            // Replace any other CDN references
            .replace(
              /<script[^>]*src=["']https?:\/\/cdnjs\.cloudflare\.com[^"']*["'][^>]*><\/script>/g,
              (match) => {
                if (match.includes('font-awesome')) {
                  return '<link rel="stylesheet" href="/assets/vendor/font-awesome/css/all.min.css">';
                }
                return '<!-- External script removed for security -->';
              }
            );

          // Write the modified HTML to the iframe
          iframeDoc.open();
          iframeDoc.write(modifiedHtml);
          iframeDoc.close();

          // Save to cache for next time
          this.saveVisualizationToCache(filename, modifiedHtml);

          // Hide spinner and apply fixes
          this.hideLoadingSpinner(iframe);
          this.applyLegendFix(iframe);
        })
        .catch((error) => {
          console.error('Error loading visualization:', error);
          this.hideLoadingSpinner(iframe);

          // Show error message in the iframe
          const iframeDoc = iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(`
            <html>
              <head>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    text-align: center;
                    color: #333;
                  }
                  .error-container {
                    margin: 50px auto;
                    max-width: 500px;
                    padding: 30px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-left: 5px solid #e74c3c;
                  }
                  h3 {
                    color: #e74c3c;
                    margin-top: 0;
                  }
                  button {
                    background: #0066cc;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 20px;
                    font-size: 14px;
                  }
                </style>
              </head>
              <body>
                <div class="error-container">
                  <h3>Visualization could not be loaded</h3>
                  <p>There was an error loading the visualization content. This might be due to network issues or content security policy restrictions.</p>
                  <p>Error: ${error.message}</p>
                  <button onclick="window.parent.location.reload();">Refresh Page</button>
                </div>
              </body>
            </html>
          `);
            iframeDoc.close();
          }
        });
    }
  }
}
