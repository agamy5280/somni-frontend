import { Component, Input } from '@angular/core';
import { DataService } from '../../../services/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ClipboardService } from 'ngx-clipboard';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-chatbot-message',
  standalone: false,
  templateUrl: './chatbot-message.component.html',
  styleUrl: './chatbot-message.component.scss',
})
export class ChatbotMessageComponent {
  @Input() message: any;

  // Track copy state
  copiedSql = false;
  copiedMessage = false;
  downloadedJson = false; // Add the missing downloadedJson property
  copiedTimeout: any;
  messageTimeout: any;
  downloadTimeout: any; // Add the missing downloadTimeout property

  constructor(
    private dataService: DataService,
    private sanitizer: DomSanitizer,
    private clipboardService: ClipboardService
  ) {}

  // Get the current user's name for display
  getCurrentUserName(): string {
    const user = this.dataService.getCurrentUser();
    return user ? user.fullName : 'You';
  }

  // Format message content to handle markdown-like syntax
  formatMessageContent(content: string): SafeHtml {
    if (!content) return '';

    // Replace **text** with <strong>text</strong> for bold
    let formattedText = content.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Replace newlines with <br> for line breaks
    formattedText = formattedText.replace(/\n/g, '<br>');

    // Since we now store SQL separately and don't include it in the message content,
    // we only need to handle the normal code blocks, not SQL blocks

    // For all code blocks
    formattedText = formattedText.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (match, language, code) => {
        const languageClass = language ? ` class="language-${language}"` : '';
        return `<pre><code${languageClass}>${this.escapeHtml(
          code
        )}</code></pre>`;
      }
    );

    // Handle inline code
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }

  // Extract SQL code from message metadata
  extractSqlCode(): string {
    if (!this.message.rawSql) {
      return '';
    }

    // Format SQL with line breaks for better readability
    return this.formatSqlQuery(this.message.rawSql);
  }

  private formatSqlQuery(sql: string): string {
    if (!sql) return '';

    // Replace common SQL keywords with keywords + newline
    const formattedSql = sql
      // Add newlines after these keywords
      .replace(
        /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|ON|AND|OR|UNION|LIMIT)\b/gi,
        (match) => `\n${match}`
      )
      // Clean up double newlines
      .replace(/\n\s*\n/g, '\n')
      // Trim leading/trailing whitespace
      .trim();

    return formattedSql;
  }

  // Copy SQL to clipboard
  copySqlToClipboard(): void {
    const sql = this.extractSqlCode();
    if (sql) {
      this.clipboardService.copyFromContent(sql);
      this.copiedSql = true;

      // Clear any existing timeout
      if (this.copiedTimeout) {
        clearTimeout(this.copiedTimeout);
      }

      // Reset copied state after 3 seconds
      this.copiedTimeout = setTimeout(() => {
        this.copiedSql = false;
      }, 3000);
    }
  }

  // Copy entire message content to clipboard
  copyMessageContent(): void {
    if (this.message && this.message.content) {
      this.clipboardService.copyFromContent(this.message.content);
      this.copiedMessage = true;

      // Clear any existing timeout
      if (this.messageTimeout) {
        clearTimeout(this.messageTimeout);
      }

      // Reset copied state after 3 seconds
      this.messageTimeout = setTimeout(() => {
        this.copiedMessage = false;
      }, 3000);
    }
  }

  // Helper to escape HTML in code blocks
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Download JSON results
  // Download JSON results
  downloadJsonResults(): void {
    if (this.message && this.message.results) {
      // Create a formatted JSON string with indentation
      const jsonData = JSON.stringify(this.message.results, null, 2);

      // Create a Blob with the JSON data
      const blob = new Blob([jsonData], { type: 'application/json' });

      // Get the user's query from the previous message
      let queryText = '';

      // If we're in a conversation, we can try to find the related user query
      if (this.message.userQuery) {
        // If we have the direct reference to the user query
        queryText = this.message.userQuery;
      } else {
        // Get the first few words of the SQL query if available
        if (this.message.rawSql) {
          // Extract main action from SQL (e.g., "SELECT transaction_amount FROM...")
          const sqlMatch = this.message.rawSql.match(/SELECT\s+([^\s]+)/i);
          if (sqlMatch && sqlMatch[1]) {
            queryText = `${sqlMatch[1]}_query`;
          }
        }

        // If we still don't have a query, try to infer from the content
        if (!queryText) {
          // Try to extract key terms from the bot's response
          const contentWords = this.message.content
            .split(/\s+/)
            .slice(0, 5)
            .join('_');
          if (contentWords) {
            queryText = contentWords;
          }
        }
      }

      // Fallback if we couldn't determine a suitable name
      if (!queryText) {
        // Check if "transaction", "ATM", or other keywords are in the content
        if (this.message.content.toLowerCase().includes('transaction')) {
          queryText = 'transaction_data';
        } else if (this.message.content.toLowerCase().includes('atm')) {
          queryText = 'atm_transactions';
        } else {
          queryText = 'query_results';
        }
      }

      // Clean up the filename - keep only alphanumeric characters, underscores, and hyphens
      const cleanFilename = queryText
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_') // Replace invalid chars with underscores
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .slice(0, 50); // Limit length

      // Add timestamp for uniqueness
      const timestamp = new Date().getTime().toString().slice(-6);
      const filename = `${cleanFilename}_${timestamp}.json`;

      // Create an invisible link and click it to download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Show success indicator
      this.downloadedJson = true;

      // Clear any existing timeout
      if (this.downloadTimeout) {
        clearTimeout(this.downloadTimeout);
      }

      // Reset state after 3 seconds
      this.downloadTimeout = setTimeout(() => {
        this.downloadedJson = false;
      }, 3000);
    }
  }
}
