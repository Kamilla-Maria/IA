const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Cadastro de Novo Usuário
exports.registrar = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        // 1. Verificar se o usuário já existe
        const usuarioExiste = await Usuario.findOne({ email });
        if (usuarioExiste) {
            return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
        }

        // 2. Criar novo usuário (a criptografia acontece no Model/Usuario.js)
        const novoUsuario = await Usuario.create({ nome, email, senha });

        res.status(201).json({
            sucesso: true,
            mensagem: "Usuário registrado com sucesso! 🎀"
        });

    } catch (error) {
        res.status(500).json({ erro: "Erro ao registrar usuário.", detalhes: error.message });
    }
};

// Login do Usuário
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        // 1. Buscar usuário e incluir a senha (que está como select: false no model)
        const usuario = await Usuario.findOne({ email }).select('+senha');
        
        if (!usuario) {
            return res.status(401).json({ erro: "E-mail ou senha incorretos." });
        }

        // 2. Comparar a senha digitada com a criptografada
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ erro: "E-mail ou senha incorretos." });
        }

        // 3. Gerar o "Crachá Digital" (JWT)
        // O Token expira em 24h para segurança
        const token = jwt.sign(
            { id: usuario._id, nome: usuario.nome },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            sucesso: true,
            nome: usuario.nome,
            token: token
        });

    } catch (error) {
        res.status(500).json({ erro: "Erro ao realizar login." });
    }
};