const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Création du dossier d'upload s'il n'existe pas
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuration de Multer pour les photos/vidéos
const upload = multer({ dest: 'uploads/' });

let users = [];
let messages = [];
let statuses = [];

// ===== ROUTES API =====

// Connexion / Création de compte
app.post('/api/login', (req, res) => {
  const { nom, telephone, avatar } = req.body;
  let user = users.find(u => u.telephone === telephone);
  if (!user) {
    user = { id: Date.now().toString(), nom, telephone, avatar, online: true };
    users.push(user);
  } else {
    user.nom = nom; 
    if (avatar) user.avatar = avatar; 
    user.online = true;
  }
  res.json(user);
});

// Récupérer tous les utilisateurs
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Upload de fichiers
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Pas de fichier" });
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype, name: req.file.originalname });
});

// Récupérer les statuts
app.get('/api/statuses', (req, res) => {
  res.json(statuses);
});

// ===== SOCKET.IO (Temps réel) =====
io.on('connection', (socket) => {
  // Quand un utilisateur se connecte
  socket.on('user:online', (id) => {
    io.emit('users:update', users);
  });

  // Quand un message est envoyé
  socket.on('message:send', (m) => {
    messages.push(m);
    io.emit('message:new', m);
  });

  // Quand un statut est publié
  socket.on('status:new', (s) => {
    statuses.push(s);
    io.emit('status:new', s);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    // Optionnel : passer l'utilisateur en hors ligne
  });
});

// ===== LANCEMENT =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Talksy tourne sur le port ${PORT}`);
});
