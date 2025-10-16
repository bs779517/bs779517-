const express = require('express');
const multer = require('multer'); // We need multer for form-data parsing, even without file uploads
const cors = require('cors');
const path = require('path');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // All HTML/CSS/JS files

// --- डेटा को मेमोरी में स्टोर करें ---
let polls = {};
let pollCounter = 0;

// --- Multer सेटअप ---
const upload = multer(); // Use multer just to parse multipart/form-data

// --- HTML पेज दिखाने के लिए Routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/poll.html', (req, res) => res.sendFile(path.join(__dirname, 'poll.html')));

// --- API Routes ---

// नया पोल बनाने के लिए
app.post('/api/poll', upload.none(), (req, res) => {
    try {
        const { question, optionsTexts } = req.body;
        const parsedOptions = JSON.parse(optionsTexts);
        if (!question || !parsedOptions || parsedOptions.length < 2) {
            return res.status(400).json({ message: 'Question and options are required.' });
        }
        const newPoll = {
            id: ++pollCounter,
            question,
            options: parsedOptions.map(text => ({ text, image: null, votes: 0 })),
            votedIPs: []
        };
        polls[newPoll.id] = newPoll;
        res.status(201).json(newPoll);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// किसी पोल को एडिट (अपडेट) करने के लिए
app.put('/api/poll/:id', (req, res) => {
    const pollId = req.params.id;
    const { question, options } = req.body;
    const pollToUpdate = polls[pollId];
    if (!pollToUpdate) {
        return res.status(404).json({ message: 'Poll not found.' });
    }
    pollToUpdate.question = question;
    const updatedOptions = options.map((newOptionText, index) => {
        const oldVoteCount = pollToUpdate.options[index] ? pollToUpdate.options[index].votes : 0;
        return { text: newOptionText, image: null, votes: oldVoteCount };
    });
    pollToUpdate.options = updatedOptions;
    res.status(200).json(pollToUpdate);
});

// वोट करने के लिए
app.post('/api/poll/:id/vote', (req, res) => {
    const pollId = req.params.id;
    const { optionIndex } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const poll = polls[pollId];
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });
    if (poll.votedIPs.includes(ip)) return res.status(403).json({ message: 'You have already voted.' });
    if (poll.options[optionIndex] === undefined) return res.status(400).json({ message: 'Invalid option.' });
    poll.options[optionIndex].votes++;
    poll.votedIPs.push(ip);
    res.status(200).json(poll);
});

// पोल का डेटा पाने के लिए
app.get('/api/poll/:id', (req, res) => {
    const pollId = req.params.id;
    const poll = polls[pollId];
    if (poll) {
        res.status(200).json(poll);
    } else {
        res.status(404).json({ message: 'Poll not found.' });
    }
});

// एडमिन का सारा डेटा पाने के लिए
app.get('/admin/polls', (req, res) => {
    res.status(200).json(Object.values(polls));
});

// <<< YEH HAI SABSE ZAROORI BADLAV >>>
// app.listen() को हटा दिया गया है ताकि Vercel पर Timeout न हो
module.exports = app;
