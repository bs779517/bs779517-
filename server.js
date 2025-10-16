const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(cors()); // Cross-Origin Resource Sharing को इनेबल करें
app.use(express.json()); // JSON बॉडी को पार्स करने के लिए
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 'uploads' फोल्डर को public बनाएं

// <<< YAHI HAI WOH ZAROORI LINE JO HTML FILE DIKHAYEGI >>>
// यह लाइन index.html, poll.html, और admin.html जैसी फाइलों को पब्लिक बनाती है।
app.use(express.static(__dirname));

// --- डेटा को मेमोरी में स्टोर करें (वास्तविक ऐप के लिए डेटाबेस का उपयोग करें) ---
let polls = {};
let pollCounter = 0;

// --- Multer सेटअप इमेज अपलोड के लिए ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- API Routes ---

// 1. नया पोल बनाने के लिए
app.post('/api/poll', upload.array('optionsImages', 10), (req, res) => {
    try {
        const { question, optionsTexts } = req.body;
        
        // Front-end से stringified JSON को parse करें
        const parsedOptions = JSON.parse(optionsTexts);

        if (!question || !parsedOptions || parsedOptions.length < 2) {
            return res.status(400).json({ message: 'Question and at least two options are required.' });
        }
        
        const newPoll = {
            id: ++pollCounter,
            question,
            options: parsedOptions.map((optionText, index) => ({
                text: optionText,
                image: req.files[index] ? req.files[index].path : null,
                votes: 0
            })),
            votedIPs: [] // इस पोल पर वोट कर चुके IP एड्रेस को स्टोर करने के लिए
        };

        polls[newPoll.id] = newPoll;
        console.log('Poll Created:', newPoll);
        res.status(201).json(newPoll);

    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// 2. किसी पोल पर वोट करने के लिए
app.post('/api/poll/:id/vote', (req, res) => {
    const pollId = req.params.id;
    const { optionIndex } = req.body;
    const ip = req.ip; // यूजर का IP एड्रेस प्राप्त करें

    const poll = polls[pollId];

    if (!poll) {
        return res.status(404).json({ message: 'Poll not found.' });
    }

    // जांचें कि क्या इस IP से पहले ही वोट किया जा चुका है
    if (poll.votedIPs.includes(ip)) {
        return res.status(403).json({ message: 'You have already voted on this poll from this IP.' });
    }

    if (poll.options[optionIndex] !== undefined) {
        poll.options[optionIndex].votes++;
        poll.votedIPs.push(ip); // IP को रिकॉर्ड करें
        console.log('Vote Submitted for Poll ID:', pollId, 'by IP:', ip);
        res.status(200).json(poll);
    } else {
        res.status(400).json({ message: 'Invalid option.' });
    }
});

// 3. पोल का डेटा (और रिजल्ट) प्राप्त करने के लिए
app.get('/api/poll/:id', (req, res) => {
    const pollId = req.params.id;
    const poll = polls[pollId];
    if (poll) {
        res.status(200).json(poll);
    } else {
        res.status(404).json({ message: 'Poll not found.' });
    }
});

// एडमिन पैनल के लिए (सरल उदाहरण)
app.get('/admin/polls', (req, res) => {
    // यहां आप पासवर्ड सुरक्षा जोड़ सकते हैं
    res.status(200).json(Object.values(polls));
});

// --- सर्वर को शुरू करें ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Now your website is available through your ngrok link!');
});