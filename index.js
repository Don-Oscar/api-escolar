const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. CONEXIÓN A MONGODB ---
const MONGO_URI = "mongodb+srv://Oscar:2204rc@cluster0.alcdk7a.mongodb.net/EscuelaDB?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ API conectada a MongoDB Atlas"))
    .catch((err) => console.error("❌ Error de conexión:", err));

// ==========================================
//      MODELOS (ESQUEMAS DE DATOS)
// ==========================================

// 1. Modelo de ASISTENCIA (Lo que ya tenías)
const EstudianteSchema = new mongoose.Schema({
    nombre: String,
    curso: String,
    asistencias: Number,
    fecha: { type: Date, default: Date.now }
});
const Estudiante = mongoose.model('Estudiante', EstudianteSchema);

// 2. Modelo de USUARIO (NUEVO: Para el Login)
const UsuarioSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // En la vida real esto se encripta
    nombre: String,
    rol: { type: String, enum: ['profesor', 'estudiante'], default: 'estudiante' }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// ==========================================
//                RUTAS
// ==========================================

app.get('/', (req, res) => {
    res.send("¡Hola! La API de la Escuela está funcionando 🚀");
});

// --- RUTA NUEVA: LOGIN ---
// Esta es la que usará tu LoginScreen.kt modificado
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔐 Intentando login: ${email}`);

        // Buscar usuario en la base de datos
        const usuario = await Usuario.findOne({ email: email });

        // Validaciones básicas
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        if (usuario.password !== password) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        // ¡ÉXITO! Devolvemos los datos y EL ROL importante
        res.json({
            mensaje: "Login exitoso",
            userId: usuario._id,
            nombre: usuario.nombre,
            rol: usuario.rol, // <--- ESTO ES LO QUE LEERÁ TU APP ANDROID
            token: "token_simulado_123" 
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// --- RUTA UTILIDAD: CREAR USUARIO (Solo para que puedas meter datos la primera vez) ---
app.post('/api/crear-usuario', async (req, res) => {
    try {
        const nuevoUsuario = new Usuario(req.body);
        await nuevoUsuario.save();
        res.json({ mensaje: "Usuario creado", usuario: nuevoUsuario });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- RUTAS DE ESTUDIANTES (Lo que ya tenías) ---
app.post('/api/guardar-estudiante', async (req, res) => {
    try {
        const nuevoEstudiante = new Estudiante(req.body);
        await nuevoEstudiante.save();
        res.status(201).json({ mensaje: "Guardado", id: nuevoEstudiante._id });
    } catch (error) {
        res.status(500).json({ error: "Error al guardar" });
    }
});

app.get('/api/ver-estudiantes', async (req, res) => {
    const lista = await Estudiante.find();
    res.json(lista);
});

// --- ENCENDER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🤖 Servidor listo en puerto ${PORT}`);
});