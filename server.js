require('dotenv').config(); // .env फाइल को लोड करने के लिए
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Cloudinary को कॉन्फ़िगर करें ---
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// --- Cloudinary के लिए Multer Storage बनाएं ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'poll_uploads', // Cloudinary में इस नाम का फोल्डर बनेगा
    format: async (req, file) => 'webp', // इमेज को webp फॉर्मेट में बदलें
    public_id: (req, file) => file.fieldname + '-' + Date.now(),
  },
});

const upload = multer({ storage: storage }).fields([
    { name: 'pollLogo', maxCount: 1 },
    { name: 'optionsImages', maxCount: 10 }
]);

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- डेटा को मेमोरी में स्टोर करें ---
let polls = {};
let pollCounter = 0;

// --- HTML पेज दिखाने के लिए Routes ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/poll.html', (req, res) => res.sendFile(path.join(__dirname, 'poll.html')));

// --- API Routes ---
app.post('/api/poll', upload, (req, res) => {
    try {
        const { question, optionsTexts } = req.body;
        const parsedOptions = JSON.parse(optionsTexts);

        if (!question || !parsedOptions || parsedOptions.length < 2) {
            return res.status(400).json({ message: 'Question and at least two options are required.' });
        }
        
        const newPoll = {
            id: ++pollCounter,
            question,
            // अब हम Cloudinary से मिला URL सेव करेंगे
            logo: req.files.pollLogo ? req.files.pollLogo[0].path : null,
            options: parsedOptions.map((optionText, index) => {
                const optionImages = req.files.optionsImages || [];
                return {
                    text: optionText,
                    image: optionImages[index] ? optionImages[index].path : null,
                    votes: 0
                };
            }),
            votedIPs: []
        };
        polls[newPoll.id] = newPoll;
        res.status(201).json(newPoll);
    } catch (error) {
        console.error('Error creating poll:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// (बाकी के API Routes वैसे ही रहेंगे)
// ... वोट करने, पोल देखने, और एडमिन डेटा के लिए Routes ...
app.post('/api/poll/:id/vote', (req, res) => { /* ... */ });
app.get('/api/poll/:id', (req, res) => { /* ... */ });
app.get('/admin/polls', (req, res) => { /* ... */ });


// --- सर्वर को शुरू करें ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
