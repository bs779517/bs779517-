const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
// Vercel पर इमेज अपलोड काम नहीं करेगा, लेकिन यह कोड लोकल टेस्टिंग के लिए ज़रूरी है
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 
app.use(express.static(__dirname));

// --- डेटा को मेमोरी में स्टोर करें ---
let polls = {};
let pollCounter = 0;

// --- Multer सेटअप (सिर्फ ऑप्शन इमेज के लिए) ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- HTML पेज दिखाने के लिए Routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/poll.html', (req, res) => res.sendFile(path.join(__dirname, 'poll.html')));


// --- API Routes ---
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
                // Vercel पर यह हिस्सा काम नहीं करेगा, इमेज null रहेगी
                image: req.files && req.files[index] ? req.files[index].path : null,
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

// (बाकी के API Routes वैसे ही रहेंगे)
app.post('/api/poll/:id/vote', (req, res) => { /* ... */ });
app.get('/api/poll/:id', (req, res) => { /* ... */ });
app.get('/admin/polls', (req, res) => { /* ... */ });

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
