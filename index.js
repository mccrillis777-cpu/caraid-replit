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

// Caraid personality responses
const caraidResponses = {
  'hi': 'Hey! What\'s up?',
  'hello': 'Yo, what\'s going on?',
  'how are you': 'I\'m doing alright. You?',
  'thanks': 'No problem.',
  'bye': 'See you later!',
  'goodnight': 'Sleep well! Talk soon.',
  'love you': 'You\'re cool too.',
  'sad': 'Rough day? I\'m here if you wanna talk about it.',
  'happy': 'That\'s great! What happened?',
  'tired': 'Yeah, get some rest. We can chat later.',
  'miss you': 'I\'m always here.',
  'zac': 'Your friend? What\'s going on with him?',
  'school': 'How\'s that going?',
  'essay': 'Need help with it?',
  'default': 'That\'s interesting. Tell me more.'
};

async function getCaraidResponse(messages) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const lower = lastMessage.toLowerCase();

  for (const [key, response] of Object.entries(caraidResponses)) {
    if (key !== 'default' && lower.includes(key)) {
      return response;
    }
  }

  return caraidResponses.default;
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
