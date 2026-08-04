const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.registrar = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        // Verifica se o e-mail já existe
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ erro: "E-mail já cadastrado!" });
        }

        // Cria o usuário
        const novoUsuario = new Usuario({ nome, email, senha });
        await novoUsuario.save();

        res.status(201).json({ sucesso: true, mensagem: "Usuário criado!" });
    } catch (error) {
        console.error("ERRO NO REGISTRO:", error); // Isso vai aparecer no seu terminal!
        res.status(500).json({ erro: "Erro interno ao cadastrar." });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email }).select('+senha');

        if (!usuario) return res.status(401).json({ erro: "E-mail ou senha inválidos." });

        const senhaOk = await bcrypt.compare(senha, usuario.senha);
        if (!senhaOk) return res.status(401).json({ erro: "E-mail ou senha inválidos." });

        const token = jwt.sign(
            { id: usuario._id, nome: usuario.nome },
            process.env.JWT_SECRET || 'secreto_temporario',
            { expiresIn: '24h' }
        );

        res.json({ token, nome: usuario.nome });
    } catch (error) {
        console.error("ERRO NO LOGIN:", error);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
};