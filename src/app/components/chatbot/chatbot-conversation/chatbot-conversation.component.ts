import {
  Component,
  Input,
  OnChanges,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';

@Component({
  selector: 'app-chatbot-conversation',
  standalone: false,
  templateUrl: './chatbot-conversation.component.html',
  styleUrl: './chatbot-conversation.component.scss',
})
export class ChatbotConversationComponent
  implements OnChanges, AfterViewChecked
{
  @Input() currentChat: any;
  @Input() messages: any[] = [];
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageTextarea') private messageTextarea!: ElementRef;

  messageText: string = '';
  typing: boolean = false;
  shouldScrollToBottom: boolean = false;

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
    if (!this.messageText.trim()) return;

    // Add user message
    this.messages.push({
      id: Date.now(),
      type: 'user',
      content: this.messageText,
    });

    // Clear input
    this.messageText = '';

    // Flag that we should scroll to bottom
    this.shouldScrollToBottom = true;

    // Show typing indicator
    this.typing = true;

    // Simulate bot response
    setTimeout(() => {
      this.typing = false;

      const botResponses = [
        "I've analyzed the transaction data from IBM Safer Payments. The suspicious pattern you noticed appears in 3.2% of cases, which is above our normal threshold of 2.5%.",
        "Based on the query through WatsonX.ai NLQ, I've generated the SQL analysis. The results show 28 transactions matching your criteria in the last 24 hours.",
        "I've created a new payment investigation case #PAY-29384 in the system. You can track its status through IBM Safer Payments portal.",
        "According to our data pipeline, this transaction was exported in yesterday's batch at 23:15 GMT. You can find the full logs in the HIVE transaction database.",
      ];

      const randomResponse =
        botResponses[Math.floor(Math.random() * botResponses.length)];

      // Add bot message
      this.messages.push({
        id: Date.now() + 1,
        type: 'bot',
        content: randomResponse,
      });

      // Flag that we should scroll to bottom again
      this.shouldScrollToBottom = true;
    }, 1500);
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
