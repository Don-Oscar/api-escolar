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
    asistencias: { type: Number, default: 0 }, // Clases a las que fue
    total_clases: { type: Number, default: 0 }, // <--- AGREGA ESTO (Clases dictadas)
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

// 1. MODELO DE CURSO
const CursoSchema = new mongoose.Schema({
    nombre: String,
    horario: String,
    profesorEmail: String, // <--- Esto vincula el curso contigo
    codigo: String
});
const Curso = mongoose.model('Curso', CursoSchema);

// 2. RUTA PARA VER MIS CURSOS (Dashboard)
app.get('/api/cursos/:email', async (req, res) => {
    try {
        const emailProfesor = req.params.email;
        // Busca cursos donde el profesor sea el dueño
        const cursos = await Curso.find({ profesorEmail: emailProfesor });
        res.json(cursos);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo cursos" });
    }
});

// 3. RUTA RÁPIDA PARA CREAR CURSOS (Úsala con Postman una vez)
app.post('/api/crear-curso', async (req, res) => {
    try {
        const nuevoCurso = new Curso(req.body);
        await nuevoCurso.save();
        res.json({ mensaje: "Curso creado exitosamente", curso: nuevoCurso });
    } catch (error) {
        res.status(500).json({ error: "Error creando curso" });
    }
});
app.get('/api/cursos/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const cursos = await Curso.find({ profesorEmail: email });
        res.json(cursos);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo cursos" });
    }
});

app.get('/', (req, res) => {
    res.send("¡Hola! La API de la Escuela está funcionando 🚀");
});

// --- RUTA NUEVA: LOGIN ---
// Esta es la que usará tu LoginScreen.kt modificado
// BUSCA ESTA PARTE EN TU index.js Y REEMPLÁZALA:

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const usuario = await Usuario.findOne({ email });

        // ❌ CASO 1: Usuario no existe
        if (!usuario) {
            return res.json({ 
                status: "error", 
                message: "El usuario no existe", 
                rol: null 
            });
        }

        // ❌ CASO 2: Contraseña incorrecta (Asumiendo que comparas simple o con bcrypt)
        if (usuario.password !== password) { 
            return res.json({ 
                status: "error", 
                message: "Contraseña incorrecta", 
                rol: null 
            });
        }

        // ✅ CASO 3: ÉXITO TOTAL
        res.json({
            status: "success",      // <--- LA CLAVE QUE BUSCA LA APP
            message: "Login exitoso", // <--- EL MENSAJE QUE BUSCA LA APP
            rol: usuario.rol,       // <--- IMPORTANTE PARA SABER SI ES PROFE
            userId: usuario._id,
            nombre: usuario.nombre
        });

    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Error en el servidor", 
            rol: null 
        });
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
// RUTA: MARCAR ASISTENCIA (Actualiza los contadores)
app.post('/api/marcar-asistencia', async (req, res) => {
    const { estudianteId, estaPresente } = req.body; // Android envía esto

    try {
        // 1. Buscamos al estudiante
        const estudiante = await Estudiante.findById(estudianteId);
        
        if (!estudiante) {
            return res.status(404).json({ error: "Estudiante no encontrado" });
        }

        // 2. LÓGICA DE NEGOCIO:
        // Siempre aumentamos el total de clases porque la clase ocurrió.
        estudiante.total_clases += 1;

        // Solo aumentamos 'asistencias' si el checkbox estaba marcado (true)
        if (estaPresente) {
            estudiante.asistencias += 1;
        }

        // 3. Guardamos el cambio
        await estudiante.save();

        res.json({ 
            mensaje: "Asistencia actualizada", 
            nuevo_porcentaje: (estudiante.asistencias / estudiante.total_clases) * 100 
        });

    } catch (error) {
        res.status(500).json({ error: "Error al marcar asistencia" });
    }
});