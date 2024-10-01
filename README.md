1. Clonage du projet :

rendez-vous dans le dossier ou vous souhaitez cloner le projet

commande : git clone https://github.com/Mikelcks/P7_MonVieuxGrimoire.git

2. Installation des dépendances :

- rendez-vous dans le dossier fontend

commande : npm install

- rendez-vous dans le dossier backend

commande : npm install
commande : npm install -g nodemon ( Cela rend nodemon disponible sur tout le système peu importe ou se trouve le dossier )

3. Configuration de la base de données :

Localisez le fichier .env dans le dossier backend.
- Si le port 4000 est deja utilisé par une autre application vous pouvez le remplacer par le port de votre choix

- Vous trouverez cette ligne avec les informations de la base de données utilisée actuellement : 
MONGODB_URI=mongodb+srv://mikeloc:rino57@cluster0.rkuf9.mongodb.net/test?retryWrites=true&w=majority
MONGODB_URI=mongodb://<username>:<password>@<host>:<port>/<dbname>
Remplacer les informations actuelles par celles de votre propre base de données.


4. Lancement du projet en local :

Maintenant que toutes les dépendances sont installées nous pouvons lancer le projet en local. Pour cela il vous faudra ouvrir 2 terminaux:

commande a lancer dans le 1er terminal dans le dossier backend : nodemon server ( nodemon redémarre automatiquement le serveur lors de modifications )
commande a lancer dans le 2nd terminal dans le dossier frontend : npm run start
