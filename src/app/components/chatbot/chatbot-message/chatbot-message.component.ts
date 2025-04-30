import { Component, Input } from '@angular/core';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-chatbot-message',
  standalone: false,
  templateUrl: './chatbot-message.component.html',
  styleUrl: './chatbot-message.component.scss',
})
export class ChatbotMessageComponent {
  @Input() message: any;

  constructor(private dataService: DataService) {}

  // Get the current user's name for display
  getCurrentUserName(): string {
    const user = this.dataService.getCurrentUser();
    return user ? user.fullName : 'You';
  }
}
