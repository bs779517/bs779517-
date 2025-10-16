const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
// PORT वाली लाइन की अब Vercel पर ज़रूरत नहीं है

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // सभी HTML/CSS/JS फाइलों के लिए

// --- डेटा को मेमोरी में स्टोर करें ---
let polls = {};
let pollCounter = 0;

// --- Multer सेटअप (लोकल टेस्टिंग के लिए, Vercel पर काम नहीं करेगा) ---
const upload = multer(); // हम Vercel पर फाइलें सेव नहीं कर सकते, इसलिए इसे सरल रखें

// --- HTML पेज दिखाने के लिए Routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/poll.html', (req, res) => res.sendFile(path.join(__dirname, 'poll.html')));

// --- API Routes ---
app.post('/api/poll', upload.none(), (req, res) => { // upload.none() क्योंकि Vercel पर इमेज सेव नहीं होगी
    try {
        const { question, optionsTexts } = req.body;
        const parsedOptions = JSON.parse(optionsTexts);

        if (!question || !parsedOptions || parsedOptions.length < 2) {
            return res.status(400).json({ message: 'Question and at least two options are required.' });
        }
        
        const newPoll = {
            id: ++pollCounter,
            question,
            options: parsedOptions.map((optionText) => ({
                text: optionText,
                image: null, // Vercel पर इमेज हमेशा null रहेगी
                votes: 0
            })),
            votedIPs: []
        };
        polls[newPoll.id] = newPoll;
        res.status(201).json(newPoll);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/poll/:id/vote', (req, res) => {
    const pollId = req.params.id;
    const { optionIndex } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const poll = polls[pollId];
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });
    if (poll.votedIPs.includes(ip)) return res.status(403).json({ message: 'You have already voted on this poll.' });
    if (poll.options[optionIndex] === undefined) return res.status(400).json({ message: 'Invalid option.' });

    poll.options[optionIndex].votes++;
    poll.votedIPs.push(ip);
    res.status(200).json(poll);
});

app.get('/api/poll/:id', (req, res) => {
    const pollId = req.params.id;
    const poll = polls[pollId];
    if (poll) {
        res.status(200).json(poll);
    } else {
        res.status(404).json({ message: 'Poll not found.' });
    }
});

app.get('/admin/polls', (req, res) => {
    res.status(200).json(Object.values(polls));
});

// <<< YEH HAI SABSE ZAROORI BADLAV >>>
// app.listen() को हटा दिया गया है और app को एक्सपोर्ट किया गया है
module.exports = app;
