import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Chat, DataService, User } from '../../../services/data.service';

@Component({
  selector: 'app-chatbot-sidebar',
  standalone: false,
  templateUrl: './chatbot-sidebar.component.html',
  styleUrl: './chatbot-sidebar.component.scss',
})
export class ChatbotSidebarComponent implements OnInit {
  @Input() isOpen: boolean = true;
  @Input() chatHistory: Chat[] = [];
  @Input() currentChat: Chat | null = null;

  @Output() chatSelected = new EventEmitter<Chat>();
  @Output() newChatClicked = new EventEmitter<void>();

  currentUser: User | null = null;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // Get current user
    this.currentUser = this.dataService.getCurrentUser();
  }

  onChatSelect(chat: Chat): void {
    this.chatSelected.emit(chat);
  }

  onNewChat(): void {
    this.newChatClicked.emit();
  }

  // Format date for display
  formatDate(chat: Chat): string {
    // Check if chat has messages
    if (!chat.messages || chat.messages.length === 0) {
      return 'New';
    }

    try {
      // Find the latest message timestamp
      const latestMessage = chat.messages.reduce((latest, message) => {
        return message.timestamp > latest.timestamp ? message : latest;
      }, chat.messages[0]);

      // Make sure the timestamp is a Date object
      const messageDate =
        latestMessage.timestamp instanceof Date
          ? latestMessage.timestamp
          : new Date(latestMessage.timestamp);

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Format the date
      if (messageDate.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (messageDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        // Format as "MMM DD" (e.g. "Apr 22")
        return messageDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
    } catch (error) {
      console.error('Error formatting date for chat:', chat.id, error);
      return 'Recent';
    }
  }

  // Get user initials for avatar
  getUserInitials(): string {
    if (!this.currentUser || !this.currentUser.fullName) {
      return 'U';
    }

    const nameParts = this.currentUser.fullName.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }

    return nameParts[0][0].toUpperCase();
  }
}
