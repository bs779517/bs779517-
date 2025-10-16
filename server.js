const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Vercel के लिए पोर्ट को डायनामिक बनाएं

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname)); // HTML/CSS/JS फाइलों को पब्लिक बनाएं

// --- डेटा को मेमोरी में स्टोर करें ---
let polls = {};
let pollCounter = 0;

// --- Multer सेटअप ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// <<< YAHI HAI NAYA CODE JO ERROR THEEK KAREGA >>>
// यह सर्वर को बताता है कि मुख्य URL (/) पर index.html दिखाना है
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API Routes ---

// 1. नया पोल बनाने के लिए
app.post('/api/poll', upload.array('optionsImages', 10), (req, res) => {
    try {
        const { question, optionsTexts } = req.body;
        const parsedOptions = JSON.parse(optionsTexts);

        if (!question || !parsedOptions || parsedOptions.length < 2) {
            return res.status(400).json({ message: 'Question and at least two options are required.' });
        }
        
        const newPoll = {
            id: ++pollCounter,
            question,
            options: parsedOptions.map((optionText, index) => ({
                text: optionText,
                image: req.files && req.files[index] ? req.files[index].path : null,
                votes: 0
            })),
            votedIPs: []
        };

        polls[newPoll.id] = newPoll;
        res.status(201).json(newPoll);
    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 2. किसी पोल पर वोट करने के लिए
app.post('/api/poll/:id/vote', (req, res) => {
    const pollId = req.params.id;
    const { optionIndex } = req.body;
    // Vercel पर IP के लिए 'x-forwarded-for' हेडर का उपयोग करें
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const poll = polls[pollId];

    if (!poll) {
        return res.status(404).json({ message: 'Poll not found.' });
    }

    if (poll.votedIPs.includes(ip)) {
        return res.status(403).json({ message: 'You have already voted on this poll.' });
    }

    if (poll.options[optionIndex] !== undefined) {
        poll.options[optionIndex].votes++;
        poll.votedIPs.push(ip);
        res.status(200).json(poll);
    } else {
        res.status(400).json({ message: 'Invalid option.' });
    }
});

// 3. पोल का डेटा प्राप्त करने के लिए
app.get('/api/poll/:id', (req, res) => {
    const pollId = req.params.id;
    const poll = polls[pollId];
    if (poll) {
        res.status(200).json(poll);
    } else {
        res.status(404).json({ message: 'Poll not found.' });
    }
});

// 4. एडमिन पैनल के लिए
app.get('/admin/polls', (req, res) => {
    res.status(200).json(Object.values(polls));
});

// --- सर्वर को शुरू करें ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
