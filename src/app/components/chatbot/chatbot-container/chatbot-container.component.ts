import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DataService, Chat } from '../../../services/data.service';

@Component({
  selector: 'app-chatbot-container',
  standalone: false,
  templateUrl: './chatbot-container.component.html',
  styleUrl: './chatbot-container.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChatbotContainerComponent implements OnInit {
  sidebarOpen = true;
  currentChat: Chat | null = null;
  messages: any[] = [];
  chatHistory: Chat[] = [];

  quickActions = [
    {
      icon: 'fa-magnifying-glass',
      title: 'Query Transactions',
      description: 'Find and analyze payment data',
    },
    {
      icon: 'fa-file-invoice-dollar',
      title: 'Payment Cases',
      description: 'Create and manage payment cases',
    },
    {
      icon: 'fa-chart-line',
      title: 'Analytics',
      description: 'View transaction analytics',
    },
    {
      icon: 'fa-shield-halved',
      title: 'Fraud Detection',
      description: 'Identify suspicious patterns',
    },
  ];

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // Load chat history from data service
    this.loadChats();
  }

  loadChats(): void {
    // Check authentication state first to avoid unnecessary API calls
    if (!this.dataService.isLoggedIn()) {
      return; // Let the AuthGuard handle the redirect
    }

    this.dataService.getChats().subscribe({
      next: (chats) => {
        this.chatHistory = chats;

        // If we have chats but no selected chat, select the first one
        if (chats.length > 0 && !this.currentChat) {
          this.selectChat(chats[0]);
        }
      },
      error: (error) => {
        console.error('Error loading chats:', error);

        // Only if it's explicitly an authentication error
        if (error.message === 'Not authenticated') {
          // Don't redirect - let the AuthGuard handle it
          // Just clear the current chat state
          this.currentChat = null;
          this.messages = [];
          this.chatHistory = [];
        }
      },
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  selectChat(chat: Chat): void {
    this.currentChat = chat;

    // Convert chat messages to the format expected by the conversation component
    if (chat.messages && chat.messages.length > 0) {
      this.messages = chat.messages.map((msg) => ({
        id: msg.id,
        type: msg.sender === 'user' ? 'user' : 'bot',
        content: msg.text,
      }));
    } else {
      // If no messages, show a welcome message
      this.messages = [
        {
          id: 'system-' + Date.now(),
          type: 'system',
          content: `This conversation is about ${chat.title}.`,
        },
        {
          id: 'bot-' + Date.now(),
          type: 'bot',
          content: `How can I help with your ${chat.title.toLowerCase()} today?`,
        },
      ];
    }
  }

  startNewChat(): void {
    // Check authentication first
    if (!this.dataService.isLoggedIn()) {
      return; // Let the AuthGuard handle the redirect
    }

    // Create a new chat via the data service
    this.dataService.createChat('New Conversation').subscribe({
      next: (newChat) => {
        this.currentChat = newChat;
        this.messages = [];
        // Reload chat list to include the new chat
        this.loadChats();
      },
      error: (error) => {
        console.error('Error creating new chat:', error);

        // Only handle critical errors here - let AuthGuard handle auth
        if (error.message !== 'Not authenticated') {
          // Show an error message to the user
          // But don't redirect
        }
      },
    });
  }

  handleQuickAction(action: any): void {
    // Check authentication first
    if (!this.dataService.isLoggedIn()) {
      return; // Let the AuthGuard handle the redirect
    }

    // Create a new chat with the action title
    this.dataService.createChat(action.title).subscribe({
      next: (newChat) => {
        this.currentChat = newChat;

        // Add welcome message
        const welcomeMsg = `Welcome to ${
          action.title
        }. How can I assist you with ${action.description.toLowerCase()}?`;

        this.dataService.sendBotMessage(newChat.id, welcomeMsg).subscribe({
          next: (message) => {
            // Display the message
            this.messages = [
              {
                id: message.id,
                type: 'bot',
                content: message.text,
              },
            ];

            // Reload chat list
            this.loadChats();
          },
          error: (err) => {
            console.error('Error sending bot message:', err);

            // Don't redirect - let the AuthGuard handle auth issues
          },
        });
      },
      error: (error) => {
        console.error('Error creating chat for quick action:', error);

        // Don't redirect - let the AuthGuard handle auth issues
      },
    });
  }

  deleteChat(chat: Chat): void {
    // Check authentication first
    if (!this.dataService.isLoggedIn()) {
      return; // Let the AuthGuard handle the redirect
    }

    // Delete the chat via data service
    this.dataService.deleteChat(chat.id).subscribe({
      next: () => {
        // If the deleted chat was the current one, clear the current chat
        if (this.currentChat && this.currentChat.id === chat.id) {
          this.currentChat = null;
          this.messages = [];
        }

        // Reload chat list to reflect the deletion
        this.loadChats();
      },
      error: (error) => {
        console.error('Error deleting chat:', error);
      },
    });
  }
}
