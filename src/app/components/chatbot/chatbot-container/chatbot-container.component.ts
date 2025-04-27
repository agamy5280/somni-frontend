import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-chatbot-container',
  standalone: false,
  templateUrl: './chatbot-container.component.html',
  styleUrl: './chatbot-container.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChatbotContainerComponent implements OnInit {
  sidebarOpen = true;
  currentChat: any = null;
  messages: any[] = [];

  chatHistory = [
    { id: 1, title: 'Payment Investigation', date: 'Today' },
    { id: 2, title: 'Transaction Analysis', date: 'Yesterday' },
    { id: 3, title: 'Fraud Detection Query', date: 'Apr 22' },
    { id: 4, title: 'Customer Data Lookup', date: 'Apr 18' },
  ];

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

  constructor() {}

  ngOnInit(): void {}

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  selectChat(chat: any): void {
    this.currentChat = chat;
    // Load messages for this chat
    this.messages = [
      {
        id: 1,
        type: 'system',
        content: `This conversation is about ${chat.title}.`,
      },
      {
        id: 2,
        type: 'bot',
        content: `How can I help with your ${chat.title.toLowerCase()} today?`,
      },
    ];
  }

  startNewChat(): void {
    this.currentChat = null;
    this.messages = [];
  }

  handleQuickAction(action: any): void {
    this.currentChat = {
      id: Date.now(),
      title: action.title,
      date: 'Just now',
    };

    this.messages = [
      {
        id: Date.now(),
        type: 'bot',
        content: `Welcome to ${
          action.title
        }. How can I assist you with ${action.description.toLowerCase()}?`,
      },
    ];
  }
}
