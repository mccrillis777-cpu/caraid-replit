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

async function getCaraidResponse(messages) {
  try {
    // Convert messages to API format
    const apiMessages = [
      { role: 'system', content: CARAID_SYSTEM_PROMPT },
      ...messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // Call the LLM API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}` 
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: apiMessages,
        max_tokens: 150,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      // Fallback if API fails
      return 'That\'s interesting. Tell me more.';
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'That\'s interesting. Tell me more.';
  } catch (e) {
    console.error('LLM Error:', e);
    return 'That\'s interesting. Tell me more.';
  }
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
