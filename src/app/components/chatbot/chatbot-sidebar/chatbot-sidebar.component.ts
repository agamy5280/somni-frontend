import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-chatbot-sidebar',
  standalone: false,
  templateUrl: './chatbot-sidebar.component.html',
  styleUrl: './chatbot-sidebar.component.scss',
})
export class ChatbotSidebarComponent {
  @Input() isOpen: boolean = true;
  @Input() chatHistory: any[] = [];
  @Input() currentChat: any = null;

  @Output() chatSelected = new EventEmitter<any>();
  @Output() newChatClicked = new EventEmitter<void>();

  onChatSelect(chat: any): void {
    this.chatSelected.emit(chat);
  }

  onNewChat(): void {
    this.newChatClicked.emit();
  }
}
