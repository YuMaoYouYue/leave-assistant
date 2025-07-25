// 配置区域
const API_KEY = "YOUR_OPENAI_API_KEY"; // 替换为你的OpenAI API密钥
const BACKEND_URL = "http://localhost:5000"; // 替换为你的后端URL

// DOM元素
const messagesElement = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.querySelector('.typing-indicator');
const leaveCard = document.getElementById('leave-card');
const leaveForm = document.getElementById('leave-form');
const closeCardBtn = document.getElementById('close-card');

// 存储对话历史
let conversationHistory = [
  { role: "system", content: "你是一个专业的请假申请助手。当用户提到请假时，回复[LEAVE_FORM]触发请假表单。请用中文回答所有问题。" }
];

// 初始化
function init() {
  // 事件监听
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  closeCardBtn.addEventListener('click', () => {
    leaveCard.classList.add('hidden');
  });
  
  leaveForm.addEventListener('submit', submitLeaveForm);
  
  // 初始聚焦输入框
  userInput.focus();
  
  // 设置日期默认值
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('start-date').min = today;
  document.getElementById('end-date').min = today;
}

// 添加消息到界面
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  // 格式化消息内容
  const formattedContent = content.replace(/\n/g, '<br>');
  messageDiv.innerHTML = `<p>${formattedContent}</p>`;
  
  messagesElement.appendChild(messageDiv);
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

// 显示/隐藏输入中状态
function showTypingIndicator(show) {
  typingIndicator.style.display = show ? 'block' : 'none';
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

// 显示请假卡片
function showLeaveCard() {
  leaveCard.classList.remove('hidden');
  // 滚动到卡片位置
  leaveCard.scrollIntoView({ behavior: 'smooth' });
}

// 发送消息到AI
async function sendMessage() {
  const content = userInput.value.trim();
  if (!content) return;
  
  // 添加用户消息到界面和历史
  addMessage('user', content);
  conversationHistory.push({ role: "user", content });
  
  // 清空输入框
  userInput.value = '';
  
  // 显示"正在输入"状态
  showTypingIndicator(true);
  
  try {
    // 准备API请求
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: conversationHistory,
        temperature: 0.7
      })
    });
    
    // 处理响应
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    const reply = data.choices[0].message.content;
    
    // 添加AI回复到界面和历史
    addMessage('bot', reply);
    conversationHistory.push({ role: "assistant", content: reply });
    
    // 检查是否需要显示请假表单
    if (reply.includes('[LEAVE_FORM]')) {
      showLeaveCard();
    }
    
  } catch (error) {
    addMessage('bot', `抱歉，出错了: ${error.message}`);
  } finally {
    // 隐藏"正在输入"状态
    showTypingIndicator(false);
  }
}

// 提交请假表单
async function submitLeaveForm(e) {
  e.preventDefault();
  
  // 收集表单数据
  const leaveData = {
    type: document.getElementById('leave-type').value,
    startDate: document.getElementById('start-date').value,
    endDate: document.getElementById('end-date').value,
    reason: document.getElementById('leave-reason').value,
    applicant: document.getElementById('applicant').value,
    timestamp: new Date().toISOString()
  };
  
  // 显示提交中状态
  const submitBtn = leaveForm.querySelector('.submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
  submitBtn.disabled = true;
  
  try {
    // 发送数据到后端
    const response = await fetch(`${BACKEND_URL}/submit-leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(leaveData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // 添加成功消息到聊天
      addMessage('bot', `✅ 您的请假申请已提交成功！<br>申请编号: ${result.id}<br>类型: ${leaveData.type}<br>时间: ${leaveData.startDate} 至 ${leaveData.endDate}`);
      
      // 关闭卡片
      leaveCard.classList.add('hidden');
      
      // 重置表单
      leaveForm.reset();
    } else {
      throw new Error(result.message || '提交失败');
    }
  } catch (error) {
    alert(`提交失败: ${error.message}`);
  } finally {
    // 恢复按钮状态
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// 初始化应用
window.onload = init;