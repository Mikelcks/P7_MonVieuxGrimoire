const Book = require('../models/Book');
const fs = require('fs').promises;
const sharp = require('sharp');
const path = require('path');

exports.createBook = async (req, res, next) => {
  try {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;

    // Désactiver le cache de Sharp pour éviter que le fichier ne soit verrouillé
    sharp.cache(false);

    // Chemin du fichier d'origine
    const tempImagePath = req.file.path; // Chemin du fichier uploadé
    const optimizedFilename = `optimized_${Date.now()}.webp`; // Nom du fichier optimisé
    const optimizedImagePath = path.join('images', optimizedFilename); // Chemin complet de l'image optimisée

    // Optimisation de l'image
    await sharp(tempImagePath)
        .resize(800) // Redimensionnement à 800px de large
        .toFormat('webp') // Convertir en format WebP
        .toFile(optimizedImagePath); // Sauvegarder l'image optimisée

    // Création de l'objet Book avec l'URL de l'image optimisée
    const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${optimizedFilename}` // Utilisation du nom du fichier optimisé
    });

    await book.save();

    // Supprimer le fichier original non optimisé après un petit délai
    setTimeout(async () => {
      try {
        await fs.unlink(tempImagePath);
        console.log('Fichier original supprimé avec succès !');
      } catch (err) {
        console.error('Erreur lors de la suppression du fichier original:', err);
      }
    }, 1000); // On ajoute un délai pour être sûr que toutes les opérations sont terminées

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
    const bookObject = req.file
      ? { ...JSON.parse(req.body.book) }
      : { ...req.body };

    delete bookObject._userId;

    const book = await Book.findOne({ _id: req.params.id });
    if (book.userId != req.auth.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Si une nouvelle image a été uploadée
    if (req.file) {
      // Désactiver le cache de Sharp pour éviter que le fichier ne soit verrouillé
      sharp.cache(false);

      const tempImagePath = req.file.path; // Chemin du fichier temporaire (nouveau fichier uploadé)
      const optimizedFilename = `optimized_${Date.now()}.webp`; // Nom du fichier optimisé
      const optimizedImagePath = path.join('images', optimizedFilename); // Chemin complet du fichier optimisé

      // Optimisation de la nouvelle image
      await sharp(tempImagePath)
        .resize(800) // Redimensionnement à 800px de large
        .toFormat('webp') // Convertir en format WebP
        .toFile(optimizedImagePath); // Sauvegarder l'image optimisée

      // Supprimer l'ancienne image associée
      const oldFilename = book.imageUrl.split('/images/')[1];
      try {
        // Suppression de l'ancienne image de manière asynchrone
        await fs.unlink(`images/${oldFilename}`);
        console.log(`Ancienne image supprimée: ${oldFilename}`);
      } catch (error) {
        console.error(`Erreur lors de la suppression de l'ancienne image : ${oldFilename}`, error);
      }

      // Mise à jour de l'URL de l'image optimisée dans l'objet Book
      bookObject.imageUrl = `${req.protocol}://${req.get('host')}/images/${optimizedFilename}`;

      // Supprimer l'image temporaire non optimisée après un petit délai
      setTimeout(async () => {
        try {
          await fs.unlink(tempImagePath);
          console.log(`Image temporaire supprimée: ${tempImagePath}`);
        } catch (error) {
          console.error(`Erreur lors de la suppression de l'image temporaire: ${tempImagePath}`, error);
        }
      }, 1000); // On ajoute un délai pour être sûr que toutes les opérations sont terminées
    }

    // Mise à jour du livre dans la base de données
    await Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id });
    res.status(200).json({ message: 'Objet modifié avec succès !' });
  } catch (error) {
    res.status(400).json({ error });
  }
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(async (book) => {
      if (book.userId != req.auth.userId) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      try {
        const filename = book.imageUrl.split('/images/')[1];

        // Suppression de l'image associée
        await fs.unlink(`images/${filename}`);
        console.log('Image supprimée avec succès.');

        // Suppression du livre dans la base de données
        await Book.deleteOne({ _id: req.params.id });
        console.log('Livre supprimé avec succès.');

        res.status(200).json({ message: 'Livre et image supprimés avec succès !' });
      } catch (error) {
        // Gestion des erreurs (pour la suppression de l'image ou du livre)
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du livre ou de l\'image.' });
      }
    })
    .catch((error) => {
      res.status(500).json({ error: 'Livre non trouvé.' });
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