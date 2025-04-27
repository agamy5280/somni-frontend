import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatbotContainerComponent } from './components/chatbot/chatbot-container/chatbot-container.component';

const routes: Routes = [
  {
    path: 'chatbot',
    component: ChatbotContainerComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
