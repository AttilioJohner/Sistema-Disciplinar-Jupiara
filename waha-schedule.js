// 🏫 MIDDLEWARE DE HORÁRIO COMERCIAL PARA WAHA
// Integra com Evolution API para funcionar apenas 7h-18h (Cuiabá/MT)

const express = require('express');
const ScheduleManager = require('./schedule-config');

const app = express();
const schedule = new ScheduleManager();

// Middleware CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, apikey');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

app.use(express.json());

// 🕐 MIDDLEWARE PRINCIPAL - Verificar horário comercial
app.use((req, res, next) => {
    const status = schedule.getStatus();

    // Log da requisição
    console.log(`📊 ${new Date().toLocaleString('pt-BR')} - ${req.method} ${req.path}`);
    console.log(`⏰ Status: ${status.status} (${status.currentTime})`);

    // Se fora do horário comercial
    if (!status.isBusinessHours) {
        return res.status(503).json({
            error: 'Fora do horário de funcionamento',
            status: 503,
            message: 'API WhatsApp disponível apenas em horário comercial',
            schedule: status.schedule,
            currentTime: status.currentTime,
            nextBusinessHour: status.nextBusinessHour,
            timezone: status.timezone
        });
    }

    next();
});

// 📱 PROXY para WAHA - Redireciona para API real
app.use('/api/*', (req, res) => {
    // Aqui você redirecionaria para sua WAHA real
    // Por enquanto, simular resposta
    res.json({
        success: true,
        message: 'Requisição autorizada em horário comercial',
        timestamp: new Date().toLocaleString('pt-BR'),
        originalPath: req.path
    });
});

// 🩺 HEALTH CHECK com informações de schedule
app.get('/health', (req, res) => {
    const status = schedule.getStatus();

    res.status(status.isBusinessHours ? 200 : 503).json({
        status: status.isBusinessHours ? 'healthy' : 'sleeping',
        ...status,
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// 📋 STATUS detalhado do schedule
app.get('/schedule', (req, res) => {
    res.json(schedule.getStatus());
});

// 🏠 Página inicial com status
app.get('/', (req, res) => {
    const status = schedule.getStatus();

    res.json({
        name: 'WAHA Schedule Manager - Escola Jupiara',
        version: '1.0.0',
        ...status,
        endpoints: {
            '/health': 'Health check com schedule',
            '/schedule': 'Status detalhado do horário',
            '/api/*': 'Proxy para WAHA (horário comercial)'
        }
    });
});

// 🌐 Iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    const status = schedule.getStatus();
    console.log('🚀 WAHA Schedule Manager iniciado!');
    console.log(`📡 Porta: ${PORT}`);
    console.log(`⏰ Status atual: ${status.status}`);
    console.log(`🕐 Horário Cuiabá: ${status.currentTime}`);
    console.log(`📅 Funcionamento: ${status.schedule}`);

    // Log a cada 30 minutos
    setInterval(() => {
        const currentStatus = schedule.getStatus();
        console.log(`⏰ Status: ${currentStatus.status} - ${currentStatus.currentTime}`);
    }, 30 * 60 * 1000);
});

module.exports = app;