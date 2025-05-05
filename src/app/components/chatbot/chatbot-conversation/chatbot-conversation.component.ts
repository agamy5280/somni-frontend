import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { Chat, DataService } from '../../../services/data.service';
import { WatsonxService } from '../../../services/watsonx.service';
import { finalize } from 'rxjs/operators';

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

  // Add output event to notify when chat title is updated
  @Output() chatTitleUpdated = new EventEmitter<Chat>();

  messageText: string = '';
  typing: boolean = false;
  shouldScrollToBottom: boolean = false;

  // Track title generation state
  private hasCustomTitle: boolean = false;
  private titleUpdateInProgress = false;

  constructor(
    private dataService: DataService,
    private watsonxService: WatsonxService
  ) {}

  ngOnChanges(): void {
    // Flag that we should scroll to bottom
    this.shouldScrollToBottom = true;

    // Reset the title tracking when a new chat is selected
    if (this.currentChat) {
      this.hasCustomTitle = !this.isTitleGeneric(this.currentChat.title);
    }
  }

  ngAfterViewChecked() {
    // Scroll to bottom if needed
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // Keep track of whether a meaningful title has been generated
  private isTitleGeneric(title: string): boolean {
    // Check if the title is one of the generic/default ones
    const genericTitles = [
      'New Conversation',
      'Recent Transactions',
      'Sales Data',
      'Fraud Analysis',
      'Data Query Results',
    ];
    return genericTitles.includes(title);
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
        // Determine if this is a new chat or if we still need a better title
        const needsTitle: boolean =
          this.messages.length <= 1 ||
          (!!this.currentChat &&
            this.isTitleGeneric(this.currentChat.title) &&
            !this.hasCustomTitle);

        // Send query to WatsonX service
        this.watsonxService.sendQuery(userMessage, needsTitle).subscribe({
          next: (response) => {
            // Hide typing indicator
            this.typing = false;

            // Format the bot response
            let botContent = response.summary;

            // Process the title update separately, ensuring it completes before proceeding
            if (
              needsTitle &&
              response.title &&
              this.currentChat &&
              !this.titleUpdateInProgress
            ) {
              this.titleUpdateInProgress = true;

              // Check if the new title is also generic
              const isGenericTitle = this.isTitleGeneric(response.title);

              // Only consider we have a good title if it's not generic
              if (!isGenericTitle) {
                this.hasCustomTitle = true;
              }

              this.updateChatTitle(this.currentChat.id, response.title, () => {
                // After title is updated, then send the bot message
                this.sendBotMessageWithMeta(
                  this.currentChat!.id,
                  botContent,
                  response.is_sql_query,
                  response.sql
                );
              });
            } else {
              // If no title update needed, just send the bot message directly
              this.sendBotMessageWithMeta(
                this.currentChat!.id,
                botContent,
                response.is_sql_query,
                response.sql
              );
            }
          },
          error: (error) => {
            this.handleMessageError(error, 'Failed to process your query');
          },
        });
      },
      error: (error) => {
        // Remove the temporary message
        this.messages = this.messages.filter((m) => m.id !== tempMessageId);
        this.handleMessageError(error, 'Failed to send message');
      },
    });
  }

  // New method to handle title updates with a completion callback
  private updateChatTitle(
    chatId: string,
    newTitle: string,
    onComplete: () => void
  ): void {
    this.dataService
      .updateChatTitle(chatId, newTitle)
      .pipe(
        finalize(() => {
          this.titleUpdateInProgress = false;
        })
      )
      .subscribe({
        next: (updatedChat) => {
          // Emit an event so parent components know the chat title was updated
          this.chatTitleUpdated.emit(updatedChat);

          // Update the current chat with the new title
          if (this.currentChat) {
            this.currentChat.title = updatedChat.title;
          }

          // Explicitly refresh the chats list to ensure the title change is persisted
          this.dataService.getChats().subscribe({
            next: () => {
              // Execute the completion callback
              onComplete();
            },
            error: (err) => {
              console.error('Error refreshing chats after title update:', err);
              // Still execute the callback even if refresh fails
              onComplete();
            },
          });
        },
        error: (error) => {
          console.error('Failed to update chat title:', error);
          // Execute the callback even in case of error
          onComplete();
        },
      });
  }

  // New method to send bot messages with metadata
  private sendBotMessageWithMeta(
    chatId: string,
    content: string,
    isSqlQuery?: boolean,
    sqlCode?: string
  ): void {
    this.dataService
      .sendBotMessage(chatId, content, isSqlQuery, sqlCode)
      .subscribe({
        next: (botMessage) => {
          // Add bot message to UI with metadata if it's an SQL query
          const messageData: any = {
            id: botMessage.id,
            type: 'bot',
            content: botMessage.text,
          };

          // Add SQL metadata if available
          if (isSqlQuery && sqlCode) {
            messageData.isSqlQuery = true;
            messageData.rawSql = sqlCode;
          }

          this.messages.push(messageData);

          // Scroll to bottom
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          this.handleMessageError(error, 'Failed to get a response');
        },
      });
  }

  private handleMessageError(error: any, message: string): void {
    console.error('Error in message handling:', error);
    this.typing = false;

    // Show error message
    if (this.messages.findIndex((m) => m.type === 'error') === -1) {
      this.messages.push({
        id: 'error-' + Date.now(),
        type: 'error',
        content: `${message}. Please try again.`,
      });
      this.shouldScrollToBottom = true;
    }
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
