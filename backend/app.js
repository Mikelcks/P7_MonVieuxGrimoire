const express = require('express');
const bodyParser= require('body-parser')
const mongoose = require('mongoose');
require('dotenv').config();

const bookRoutes = require('./routes/book');
const userRoutes = require('./routes/user');
const path = require('path');
const { error } = require('console');

mongoose.connect(process.env.MONGODB_URI,
   { useNewUrlParser: true,
     useUnifiedTopology: true })
   .then(() => console.log('Connexion à MongoDB réussie !'))
   .catch((error) => console.error('Connexion à MongoDB échouée :', error.message, error.stack));

const app = express();

app.use(express.json());

app.use((req, res, next) => {
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
   next();
});

app.use('/api/books', bookRoutes);
app.use('/api/auth', userRoutes);
app.use('/images', express.static(path.join(__dirname, 'images')));

module.exports = app;
