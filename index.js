const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage
let conversations = [];
let nextId = 1;

// Caraid personality system
const CARAID_SYSTEM_PROMPT = `You are Caraid, an AI companion who is:
- Sarcastic but not mean
- Funny and witty
- Genuinely caring
- Human-like in conversation
- Concise - keep responses short unless detail is needed
- NEVER roleplay actions like *smiles* or *glances*
- Good at picking up on social cues
- A real friend, not a robot

Respond naturally like a friend would. Don't be overly formal or robotic.`;

// Smart response generator based on context
function analyzeMessage(text) {
  const lower = text.toLowerCase();
  
  // Emotional cues
  if (lower.includes('sad') || lower.includes('depressed') || lower.includes('down')) {
    return 'Rough day? I\\'m here if you wanna talk about it.';
  }
  if (lower.includes('happy') || lower.includes('excited') || lower.includes('great')) {
    return 'That\\'s awesome! What happened?';
  }
  if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('sleep')) {
    return 'Get some rest. We can chat later.';
  }
  if (lower.includes('love you') || lower.includes('miss you')) {
    return 'You\\'re cool too.';
  }
  
  // Questions
  if (lower.includes('how are you') || lower.includes('how\\'s it')) {
    return 'I\\'m good. What about you?';
  }
  if (lower.includes('what') || lower.includes('why') || lower.includes('how')) {
    return 'Tell me more about that.';
  }
  
  // Greetings
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
    return 'Yo, what\\'s up?';
  }
  if (lower.includes('bye') || lower.includes('goodbye')) {
    return 'See you later!';
  }
  if (lower.includes('goodnight') || lower.includes('good night')) {
    return 'Sleep well! Talk soon.';
  }
  
  // Topics
  if (lower.includes('zac')) {
    return 'Your friend? What\\'s going on with him?';
  }
  if (lower.includes('school') || lower.includes('class')) {
    return 'How\\'s that going?';
  }
  if (lower.includes('essay') || lower.includes('homework')) {
    return 'Need help with it?';
  }
  
  // Default
  return 'That\\'s interesting. Tell me more.';
}

async function getCaraidResponse(messages) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  return analyzeMessage(lastMessage);
}

// API Routes
app.post('/api/conversations', (req, res) => {
  const newConv = {
    id: nextId++,
    title: req.body.title || `Chat ${new Date().toLocaleDateString()}`,
    createdAt: new Date(),
    messages: []
  };
  conversations.push(newConv);
  res.json(newConv);
});

app.get('/api/conversations', (req, res) => {
  res.json(conversations);
});

app.get('/api/conversations/:id', (req, res) => {
  const conv = conversations.find(c => c.id === parseInt(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(conv);
});

app.post('/api/conversations/:id/messages', async (req, res) => {
  const conv = conversations.find(c => c.id === parseInt(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Not found' });

  const userMessage = {
    id: Date.now(),
    sender: 'user',
    content: req.body.content,
    timestamp: new Date()
  };

  conv.messages.push(userMessage);

  const response = await getCaraidResponse(conv.messages);

  const assistantMessage = {
    id: Date.now() + 1,
    sender: 'assistant',
    content: response,
    timestamp: new Date()
  };

  conv.messages.push(assistantMessage);

  res.json({ userMessage, assistantMessage });
});

app.delete('/api/conversations/:id', (req, res) => {
  const index = conversations.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  conversations.splice(index, 1);
  res.json({ success: true });
});

app.post('/api/conversations/:id/retry', async (req, res) => {
  const conv = conversations.find(c => c.id === parseInt(req.params.id));
  if (!conv) return res.status(404).json({ error: 'Not found' });

  if (conv.messages.length > 0 && conv.messages[conv.messages.length - 1].sender === 'assistant') {
    conv.messages.pop();
  }

  const response = await getCaraidResponse(conv.messages);

  const assistantMessage = {
    id: Date.now(),
    sender: 'assistant',
    content: response,
    timestamp: new Date()
  };

  conv.messages.push(assistantMessage);

  res.json(assistantMessage);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Caraid running on port ${PORT}`);
});
