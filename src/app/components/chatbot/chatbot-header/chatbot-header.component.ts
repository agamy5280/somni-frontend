import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-chatbot-header',
  standalone: false,
  templateUrl: './chatbot-header.component.html',
  styleUrl: './chatbot-header.component.scss',
})
export class ChatbotHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }
}
