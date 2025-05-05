import { Component, Input } from '@angular/core';
import { DataService } from '../../../services/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ClipboardService } from 'ngx-clipboard';

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
  copiedTimeout: any;

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
    return this.message.rawSql || '';
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

  // Helper to escape HTML in code blocks
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
