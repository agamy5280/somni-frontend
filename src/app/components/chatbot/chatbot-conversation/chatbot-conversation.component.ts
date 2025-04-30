import {
  Component,
  Input,
  OnChanges,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { Chat, DataService } from '../../../services/data.service';

@Component({
  selector: 'app-chatbot-conversation',
  standalone: false,
  templateUrl: './chatbot-conversation.component.html',
  styleUrl: './chatbot-conversation.component.scss',
})
export class ChatbotConversationComponent
  implements OnChanges, AfterViewChecked
{
  @Input() currentChat: Chat | null = null;
  @Input() messages: any[] = [];
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageTextarea') private messageTextarea!: ElementRef;

  messageText: string = '';
  typing: boolean = false;
  shouldScrollToBottom: boolean = false;

  constructor(private dataService: DataService) {}

  ngOnChanges(): void {
    // Flag that we should scroll to bottom
    this.shouldScrollToBottom = true;
  }

  ngAfterViewChecked() {
    // Scroll to bottom if needed
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.currentChat) return;

    // Check authentication first
    if (!this.dataService.isLoggedIn()) {
      return; // Let the AuthGuard handle the redirect
    }

    // Add user message to UI immediately for better UX
    const tempMessageId = 'temp-' + Date.now();
    this.messages.push({
      id: tempMessageId,
      type: 'user',
      content: this.messageText,
    });

    // Clear input and scroll
    const userMessage = this.messageText.trim();
    this.messageText = '';
    this.shouldScrollToBottom = true;

    // Show typing indicator
    this.typing = true;

    // Send message to service
    this.dataService.sendMessage(this.currentChat.id, userMessage).subscribe({
      next: (message) => {
        // Get bot response
        this.dataService.getBotResponse(userMessage).subscribe({
          next: (botResponseText) => {
            // Send bot message to the backend
            this.dataService
              .sendBotMessage(this.currentChat!.id, botResponseText)
              .subscribe({
                next: (botMessage) => {
                  // Hide typing indicator
                  this.typing = false;

                  // Add bot message to UI
                  this.messages.push({
                    id: botMessage.id,
                    type: 'bot',
                    content: botMessage.text,
                  });

                  // Scroll to bottom
                  this.shouldScrollToBottom = true;
                },
                error: (error) => {
                  console.error('Error sending bot message:', error);
                  this.typing = false;

                  // Don't redirect - let the AuthGuard handle auth issues
                  // Just show an error message
                  if (
                    this.messages.findIndex((m) => m.type === 'error') === -1
                  ) {
                    this.messages.push({
                      id: 'error-' + Date.now(),
                      type: 'error',
                      content: 'Failed to get a response. Please try again.',
                    });
                    this.shouldScrollToBottom = true;
                  }
                },
              });
          },
          error: (error) => {
            console.error('Error getting bot response:', error);
            this.typing = false;

            // Don't redirect - let the AuthGuard handle auth issues
            // Just show an error message
            if (this.messages.findIndex((m) => m.type === 'error') === -1) {
              this.messages.push({
                id: 'error-' + Date.now(),
                type: 'error',
                content: 'Failed to get a response. Please try again.',
              });
              this.shouldScrollToBottom = true;
            }
          },
        });
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.typing = false;

        // Remove the temporary message
        this.messages = this.messages.filter((m) => m.id !== tempMessageId);

        // Don't redirect - let the AuthGuard handle auth issues
        // Just show an error message
        if (this.messages.findIndex((m) => m.type === 'error') === -1) {
          this.messages.push({
            id: 'error-' + Date.now(),
            type: 'error',
            content: 'Failed to send message. Please try again.',
          });
          this.shouldScrollToBottom = true;
        }
      },
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    }
  }

  // Handle key presses for the textarea
  handleKeyDown(event: KeyboardEvent): void {
    // If Enter is pressed without Shift, send the message
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
    // Otherwise allow the default behavior (new line with Shift+Enter)

    // Auto-adjust textarea height
    setTimeout(() => {
      this.adjustTextareaHeight();
    }, 0);
  }

  // Automatically adjust textarea height based on content
  adjustTextareaHeight(): void {
    const textarea = this.messageTextarea.nativeElement;
    textarea.style.height = 'auto'; // Reset height
    const scrollHeight = textarea.scrollHeight;

    // Set a max height
    const maxHeight = 120;

    if (scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = scrollHeight + 'px';
      textarea.style.overflowY = 'hidden';
    }
  }
}
