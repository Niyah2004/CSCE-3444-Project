
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json()); // Middleware to parse JSON data

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/marketmate', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('Database connection error:', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

// Product Schema and Model
const productSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    category: String,
    imageUrl: String,
    user: String // Temporarily using String for simplicity
});

const Product = mongoose.model('Product', productSchema);

// Register User
app.post('/users/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Registration failed' });
    }
});

// Login User
app.post('/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to verify token
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token, 'secret', (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token' });

        req.userId = decoded.userId;
        next();
    });
};

// Create Product (Authenticated)
app.post('/products/create', authenticate, async (req, res) => {
    try {
        const { title, description, price, category, imageUrl } = req.body;
        const product = new Product({ title, description, price, category, imageUrl, user: req.userId });
        await product.save();
        res.status(201).json({ message: 'Product created successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to create product' });
    }
});

// Get all products
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
