import { Component, inject, signal, ElementRef, viewChild, AfterViewChecked } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { ApiService } from '../../services/api.service';
import { ChatMessage } from '../../models/course.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
      <div class="chat-panel" [class.open]="state.chatOpen()" [style.width.px]="panelWidth()">
        <div class="chat-resizer" (mousedown)="onResizeStart($event)"></div>
        <div class="chat-header" style="flex-shrink:0">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            AI Tutor
          </h3>
          <button style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center" (click)="state.setChatOpen(false)">✕</button>
        </div>

        <div class="chat-messages" #messagesContainer>
          @for (msg of messages(); track $index) {
            <div class="chat-msg-row" [class.user]="msg.role === 'user'" [class.bot]="msg.role === 'bot'">
              @if (msg.role === 'bot') {
                <div class="chat-avatar bot-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
              }
              <div class="chat-message" [class.user]="msg.role === 'user'" [class.bot]="msg.role === 'bot'">
                <div class="chat-bot-content" [innerHTML]="renderMarkdown(msg.text)"></div>
              </div>
            </div>
          }
          @if (isTyping()) {
            <div class="chat-msg-row bot">
              <div class="chat-avatar bot-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div class="chat-message bot">
                <div class="chat-typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="chat-quick-actions">
          <button (click)="quickAsk('Tóm tắt bài học')">Tóm tắt</button>
          <button (click)="quickAsk('Giải thích chi tiết')">Giải thích</button>
          <button (click)="quickAsk('Cho ví dụ')">Ví dụ</button>
        </div>

        @if (attachedFile()) {
          <div class="chat-file-preview">
            <span>📎</span>
            <span class="chat-file-name">{{ attachedFile()!.name }}</span>
            <button class="chat-file-remove" (click)="removeFile()">✕</button>
          </div>
        }

        <div class="chat-input-area">
          <button class="chat-attach-btn" (click)="fileInput.click()" title="Đính kèm file">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input #fileInput type="file" style="display:none" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" (change)="onFileSelect($event)">
          <textarea
            [(ngModel)]="inputText"
            (keydown.enter)="onEnter($event)"
            placeholder="Nhập câu hỏi..."
            rows="1"
          ></textarea>
          <button class="chat-send-btn" (click)="sendMessage()" [disabled]="!inputText.trim() && !attachedFile()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
  `
})
export class ChatPanelComponent implements AfterViewChecked {
  state = inject(AppStateService);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  messagesContainer = viewChild<ElementRef>('messagesContainer');
  messages = signal<ChatMessage[]>([
    { role: 'bot', text: 'Xin chào! Tôi là **AI Tutor**. Hãy hỏi tôi bất cứ điều gì về nội dung học tập!' }
  ]);
  inputText = '';
  isTyping = signal(false);
  attachedFile = signal<File | null>(null);
  panelWidth = signal(420);
  private shouldScroll = false;

  onResizeStart(event: MouseEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.panelWidth();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(350, Math.min(window.innerWidth - 100, startWidth + deltaX));
      this.panelWidth.set(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  renderMarkdown(text: string): SafeHtml {
    let html = text
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<div class="chat-code-block"><pre><code>$2</code></pre></div>')
      .replace(/`([^`]+)`/g, '<span class="chat-inline-code">$1</span>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^# (.*$)/gm, '<h2>$1</h2>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.attachedFile.set(input.files[0]);
    }
  }

  removeFile() {
    this.attachedFile.set(null);
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.sendMessage();
    }
  }

  quickAsk(text: string) {
    this.inputText = text;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.inputText.trim();
    const file = this.attachedFile();
    if (!text && !file) return;

    const userMsg: ChatMessage = { role: 'user', text: text || `📎 ${file!.name}` };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.inputText = '';
    this.attachedFile.set(null);
    this.isTyping.set(true);
    this.shouldScroll = true;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (text) formData.append('message', text);
      this.api.chatUpload(formData).subscribe({
        next: (data: any) => {
          this.messages.update(msgs => [...msgs, { role: 'bot', text: data.text || data.reply || data.response || 'Đã nhận file.' }]);
          this.isTyping.set(false);
          this.shouldScroll = true;
        },
        error: () => {
          this.messages.update(msgs => [...msgs, { role: 'bot', text: 'Xin lỗi, có lỗi xảy ra khi xử lý file. Vui lòng thử lại!' }]);
          this.isTyping.set(false);
          this.shouldScroll = true;
        }
      });
    } else {
      const chatMsgs = this.messages().map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));
      this.api.chat(chatMsgs, '').subscribe({
        next: (data: any) => {
          this.messages.update(msgs => [...msgs, { role: 'bot', text: data.text || data.reply || data.response || 'Hmm...' }]);
          this.isTyping.set(false);
          this.shouldScroll = true;
        },
        error: () => {
          this.messages.update(msgs => [...msgs, { role: 'bot', text: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại!' }]);
          this.isTyping.set(false);
          this.shouldScroll = true;
        }
      });
    }
  }

  private scrollToBottom() {
    const el = this.messagesContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
