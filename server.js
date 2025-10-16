const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// यह Middleware बाकी सभी स्टैटिक फाइलों (जैसे CSS या client-side JS) के लिए ज़रूरी है
app.use(express.static(__dirname)); 

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

// --- HTML पेज दिखाने के लिए स्पष्ट Routes ---

// 1. मुख्य पेज (/) के लिए
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. एडमिन पेज (/admin.html) के लिए <<< YEH NAYI LINE HAI
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 3. पोल पेज (/poll.html) के लिए <<< YEH BHI NAYI LINE HAI
app.get('/poll.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'poll.html'));
});


// --- API Routes (इनमें कोई बदलाव नहीं) ---

// नया पोल बनाने के लिए
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

// वोट करने के लिए
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

// --- सर्वर को शुरू करें ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
