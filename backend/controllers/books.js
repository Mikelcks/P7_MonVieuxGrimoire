const Book = require('../models/Book');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

exports.createBook = async (req, res, next) => {
  try {
      const bookObject = JSON.parse(req.body.book);
      delete bookObject._id;
      delete bookObject._userId;

      // Chemin du fichier d'origine
      const tempImagePath = req.file.path; // Chemin du fichier uploadé
      const optimizedImagePath = path.join('images', `optimized_${Date.now()}.webp`); // Chemin pour l'image optimisée

      // Optimisation de l'image
      await sharp(tempImagePath)
          .resize(800) // Redimensionnement à 800px de large
          .toFormat('webp') // Convertir en format WebP
          .toFile(optimizedImagePath); // Sauvegarder l'image optimisée

      // Création de l'objet Book avec l'URL de l'image optimisée
      const book = new Book({
          ...bookObject,
          userId: req.auth.userId,
          imageUrl: `${req.protocol}://${req.get('host')}/${optimizedImagePath}`
      });

      await book.save();
      fs.unlink(tempImagePath, (err) => { // Supprime le fichier original
          if (err) console.error('Error deleting temp image:', err);
      });

      res.status(201).json({ message: 'Objet enregistré !' });
  } catch (error) {
      res.status(400).json({ error });
  }
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({
    _id: req.params.id
  }).then(
    (book) => {
      res.status(200).json(book);
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.modifyBook = async (req, res, next) => {
  try {
      const bookObject = req.file ? {
          ...JSON.parse(req.body.book),
          imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
      } : { ...req.body };

      delete bookObject._userId;

      const book = await Book.findOne({ _id: req.params.id });
      if (book.userId != req.auth.userId) {
          return res.status(401).json({ message: 'Not authorized' });
      }

      if (req.file) {
          // Chemin du fichier d'origine
          const tempImagePath = req.file.path; // Chemin du fichier uploadé
          const optimizedImagePath = path.join('images', `optimized_${Date.now()}.webp`); // Chemin pour l'image optimisée

          // Optimisation de l'image
          await sharp(tempImagePath)
              .resize(800) // Redimensionnement à 800px de large
              .toFormat('webp') // Convertir en format WebP
              .toFile(optimizedImagePath); // Sauvegarder l'image optimisée

          // Supprimer l'ancienne image
          const filename = book.imageUrl.split('/images/')[1];
          fs.unlink(`images/${filename}`, (err) => {
              if (err) console.error('Error deleting old image:', err);
          });

          bookObject.imageUrl = `${req.protocol}://${req.get('host')}/${optimizedImagePath}`;
      }

      await Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id });
      res.status(200).json({ message: 'Objet modifié!' });
  } catch (error) {
      res.status(400).json({ error });
  }
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id})
      .then(book => {
          if (book.userId != req.auth.userId) {
              res.status(401).json({message: 'Not authorized'});
          } else {
              const filename = book.imageUrl.split('/images/')[1];
              fs.unlink(`images/${filename}`, () => {
                  Book.deleteOne({_id: req.params.id})
                      .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
                      .catch(error => res.status(401).json({ error }));
              });
          }
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};

exports.getAllBooks = (req, res, next) => {
  Book.find().then(
    (books) => {
      res.status(200).json(books);
    }
  ).catch(
    (error) => {
      res.status(400).json({ error: error });
    }
  );
};

exports.rateBook = (req, res, next) => {
  const userId = req.auth.userId;
  const { rating } = req.body;
  const { id } = req.params;

  if (!id || !userId || rating === undefined) {
    return res.status(400).json({ message: 'Missing required parameters.' });
  }

  if (rating < 0 || rating > 5) {
    return res.status(400).json({ message: 'Invalid rating. Rating must be between 1 and 5.' });
  }

  Book.findOne({ _id: id })
    .then(book => {
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }

      const existingRating = book.ratings.find(r => r.userId === userId);

      if (existingRating) {
        return res.status(400).json({ message: 'User has already rated this book. Ratings cannot be modified.' });
      }

      book.ratings.push({ userId, grade: rating });

      const totalRatings = book.ratings.length;
      const totalGrade = book.ratings.reduce((sum, rating) => sum + rating.grade, 0);
      book.averageRating = totalRatings > 0 ? totalGrade / totalRatings : 0;

      return book.save();
    })
    .then(updatedBook => {
      console.log('Updated Book:', updatedBook);
      res.status(200).json(updatedBook);
    })
    .catch(error => {
      console.error('Error updating book:', error);
      res.status(500).json({ error });
    });
};

exports.getBestRatedBooks = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })  // Trie par la note moyenne décroissante
    .limit(3)  // Limite à 5 résultats
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error }));
};